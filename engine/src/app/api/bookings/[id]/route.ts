// src/app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Facility from "@/models/Facility";
import Settings from "@/models/Settings";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import nodemailer from "nodemailer";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const { id } = await context.params;

  const booking = await Booking.findById(id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Authorization: must be admin or manager of this facility
  const isAdmin = session.user.role === "admin";
  const isManager = session.user.role === "manager";

  if (!isAdmin && !isManager) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // For managers: check if they manage this facility
  if (isManager) {
    const facility = await Facility.findOne({
      _id: booking.facilityId,
      managerIds: session.user.id,
    });
    if (!facility) {
      return NextResponse.json({ error: "You do not manage this facility" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { action, reason, amount, method, notes } = body;

  // Load settings once — used by several actions below
  const settings = await Settings.findOne().lean();

  let message = "";

  switch (action) {
    case "edit": {
      const {
        startTime,
        endTime,
        amenities: newAmenities,
        contactName: newContactName,
        contactEmail: newContactEmail,
        attendees: newAttendees,
        purpose: newPurpose,
        notes: newNotes,
      } = body;

      if (!startTime || !endTime) {
        return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
      }

      const newStart = new Date(startTime);
      const newEnd = new Date(endTime);

      if (newEnd <= newStart) {
        return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
      }

      if (newContactName !== undefined && !String(newContactName).trim()) {
        return NextResponse.json({ error: "Contact name cannot be empty" }, { status: 400 });
      }
      if (newContactEmail !== undefined && !String(newContactEmail).trim()) {
        return NextResponse.json({ error: "Contact email cannot be empty" }, { status: 400 });
      }

      // Check overlapping bookings — apply buffer from settings
      const bufferMs = (settings?.bookingPolicies?.bufferMinutes || 0) * 60 * 1000;
      const bufferedStart = new Date(newStart.getTime() - bufferMs);
      const bufferedEnd = new Date(newEnd.getTime() + bufferMs);

      const overlap = await Booking.findOne({
        _id: { $ne: booking._id },
        venueId: booking.venueId,
        status: { $in: ["pending", "confirmed"] },
        $and: [
          { startTime: { $lt: bufferedEnd } },
          { endTime: { $gt: bufferedStart } },
        ],
      });

      if (overlap) {
        return NextResponse.json(
          { error: "Time slot overlaps with an existing booking" },
          { status: 409 }
        );
      }

      // Recalculate pricing using facility/venue data
      const facility = await Facility.findById(booking.facilityId);
      if (!facility) {
        return NextResponse.json({ error: "Facility not found" }, { status: 404 });
      }

      const venue = facility.venues.id(booking.venueId);
      if (!venue) {
        return NextResponse.json({ error: "Venue not found" }, { status: 404 });
      }

      const durationMs = newEnd.getTime() - newStart.getTime();
      const hours = durationMs / (1000 * 60 * 60);

      // Use venue pricePerHour; fall back to settings defaultPricePerHour
      const pricePerHour = (venue.pricePerHour ?? 0) > 0
        ? venue.pricePerHour
        : (settings?.defaultPricing?.defaultPricePerHour ?? 0);

      const basePrice = hours * pricePerHour;

      let amenitySurcharge = 0;
      const validAmenities: string[] = [];

      if (Array.isArray(newAmenities) && newAmenities.length > 0 && venue.amenities?.length > 0) {
        for (const amenityId of newAmenities) {
          const amenity = venue.amenities.find(
            (a: any) => a._id.toString() === amenityId.toString()
          );
          if (amenity && typeof amenity.surcharge === "number") {
            amenitySurcharge += amenity.surcharge;
            validAmenities.push(amenityId);
          }
        }
      }

      // Apply tax from settings
      const taxPercent = settings?.defaultPricing?.taxPercent ?? 0;
      const subtotal = basePrice + amenitySurcharge;
      const taxAmount = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
      const totalPrice = subtotal + taxAmount;

      // ── Apply all field updates ──────────────────────────────────────────
      booking.startTime = newStart;
      booking.endTime = newEnd;
      booking.amenities = validAmenities as any;
      booking.basePrice = basePrice;
      booking.amenitySurcharge = amenitySurcharge;
      booking.taxAmount = taxAmount;
      booking.totalPrice = totalPrice;
      booking.remainingBalance = totalPrice - (booking.totalPaid || 0);

      if (newContactName !== undefined) booking.contactName = String(newContactName).trim();
      if (newContactEmail !== undefined) booking.contactEmail = String(newContactEmail).trim();
      if (newAttendees !== undefined) booking.attendees = Number(newAttendees) || undefined;
      if (newPurpose !== undefined) booking.purpose = String(newPurpose).trim() || undefined;
      if (newNotes !== undefined) booking.notes = String(newNotes).trim() || undefined;

      message = "Booking updated";
      break;
    }

    case "confirm":
      if (booking.status !== "pending") {
        return NextResponse.json({ error: "Booking is not pending" }, { status: 400 });
      }
      booking.status = "confirmed";
      message = "Booking confirmed";
      break;

    case "reject":
      if (booking.status !== "pending") {
        return NextResponse.json({ error: "Booking is not pending" }, { status: 400 });
      }
      booking.status = "rejected";
      message = "Booking rejected";
      break;

    case "cancel": {
      if (booking.status === "cancelled") {
        return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
      }

      // ── Cancellation window policy ─────────────────────────────────────
      const windowHours = settings?.bookingPolicies?.cancellationWindowHours ?? 0;
      if (windowHours > 0) {
        const now = new Date();
        const hoursUntilStart =
          (booking.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilStart < windowHours && hoursUntilStart >= 0) {
          return NextResponse.json(
            {
              error: `Cancellations must be made at least ${windowHours} hour(s) before the booking start time.`,
            },
            { status: 400 }
          );
        }
      }

      booking.status = "cancelled";
      message = "Booking cancelled";
      break;
    }

    case "mark-paid": {
      const paidAmount = body.paidAmount || 0;
      const paymentMethod = body.paymentMethod || "cash";

      if (paidAmount <= 0) {
        return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
      }

      booking.payments = booking.payments || [];
      booking.payments.push({
        amount: paidAmount,
        method: paymentMethod,
        date: new Date(),
        recordedBy: session.user.id,
      });

      booking.totalPaid = (booking.totalPaid || 0) + paidAmount;
      booking.remainingBalance = (booking.totalPrice || 0) - booking.totalPaid;

      if (booking.remainingBalance <= 0) {
        booking.paymentStatus = "paid";
      }

      booking.paymentMethod = paymentMethod;
      booking.paidAmount = paidAmount;
      booking.paymentDate = new Date();

      message = "Payment marked as paid";
      break;
    }

    case "record-payment": {
      if (!amount || Number(amount) <= 0) {
        return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
      }

      const paymentAmount = Number(amount);

      if (paymentAmount > (booking.remainingBalance ?? booking.totalPrice)) {
        return NextResponse.json({ error: "Amount exceeds remaining balance" }, { status: 400 });
      }

      booking.payments = booking.payments || [];
      booking.payments.push({
        amount: paymentAmount,
        method: method || "cash",
        date: new Date(),
        notes: notes || undefined,
        recordedBy: session.user.id,
      });

      booking.totalPaid = (booking.totalPaid || 0) + paymentAmount;
      booking.remainingBalance = booking.totalPrice - booking.totalPaid;

      if (booking.remainingBalance <= 0) {
        booking.paymentStatus = "paid";
      }

      message = "Payment recorded";
      break;
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Record the change in history
  booking.statusHistory = booking.statusHistory || [];
  if (action === "edit") {
    booking.statusHistory.push({
      status: booking.status,
      changedBy: session.user.id,
      changedAt: new Date(),
      reason: reason || "Booking details edited by admin",
    });
  } else {
    booking.statusHistory.push({
      status: booking.status,
      changedBy: session.user.id,
      changedAt: new Date(),
      reason: reason || (action === "record-payment" ? "Payment received" : undefined),
    });
  }

  await booking.save();

  // ── Post-save email notifications ─────────────────────────────────────────
  const emailEnabled = settings?.notifications?.emailEnabled ?? false;
  const smtpReady = !!(settings?.smtp?.host);

  if (emailEnabled && smtpReady) {
    const smtpDebug = settings?.smtpDebug ?? false;
    const fromAddress =
      settings?.smtp?.from || process.env.EMAIL_FROM || settings?.smtp?.user || "noreply@nsc.gov.sb";

    const renderTemplate = (tpl: string, vars: Record<string, string>) => {
      if (!tpl) return "";
      return tpl.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_, key) => {
        return (vars[key] ?? "") as string;
      });
    };

    // ── Booking Confirmed email ──────────────────────────────────────────
    if (action === "confirm" && settings?.notifications?.events?.bookingConfirmed !== false) {
      try {
        const facility = await Facility.findById(booking.facilityId).lean();
        const venue = (facility as any)?.venues?.id
          ? (facility as any).venues.id(booking.venueId)
          : null;

        const dashboardUrl = `${settings?.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/bookings/${booking._id}`;

        const subject = renderTemplate(
          settings?.templates?.bookingConfirmationSubject || "Booking confirmed",
          {
            bookingRef: booking.bookingRef || "",
            venueName: venue?.name || "",
            userName: booking.contactName || "",
          }
        );

        const html = renderTemplate(
          settings?.templates?.bookingConfirmationHtml || "<p>Your booking is confirmed</p>",
          {
            bookingRef: booking.bookingRef || "",
            venueName: venue?.name || "",
            userName: booking.contactName || "",
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
            dashboardUrl,
            totalPrice: (booking.totalPrice || 0).toFixed(2),
            currency: settings?.currency || "SBD",
          }
        );

        const transporter = nodemailer.createTransport({
          host: settings!.smtp!.host,
          port: settings!.smtp!.port,
          secure: settings!.smtp!.secure ?? true,
          auth: settings!.smtp!.user
            ? { user: settings!.smtp!.user, pass: settings!.smtp!.pass }
            : undefined,
          debug: smtpDebug,
          logger: smtpDebug,
        });

        await transporter.sendMail({
          from: `National Sports Council <${fromAddress}>`,
          to: booking.contactEmail,
          subject,
          html,
        });

        console.log(`📧 Booking confirmed email sent to ${booking.contactEmail}`);
      } catch (err) {
        console.error("Failed to send booking confirmation email:", err);
      }
    }

    // ── Booking Cancelled email ──────────────────────────────────────────
    if (action === "cancel" && settings?.notifications?.events?.bookingCancelled !== false) {
      try {
        const dashboardUrl = `${settings?.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/bookings/${booking._id}`;

        // Reuse bookingConfirmation template as a base, or a generic fallback
        const subject = `Booking Cancelled - ${booking.bookingRef || booking._id}`;
        const html = `
          <p>Hello ${booking.contactName || "Customer"},</p>
          <p>Your booking <strong>${booking.bookingRef || booking._id}</strong> has been <strong>cancelled</strong>.</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ""}
          <p><a href="${dashboardUrl}">View booking details</a></p>
          <p>Thank you,<br/>National Sports Council</p>
        `;

        const transporter = nodemailer.createTransport({
          host: settings!.smtp!.host,
          port: settings!.smtp!.port,
          secure: settings!.smtp!.secure ?? true,
          auth: settings!.smtp!.user
            ? { user: settings!.smtp!.user, pass: settings!.smtp!.pass }
            : undefined,
          debug: smtpDebug,
          logger: smtpDebug,
        });

        await transporter.sendMail({
          from: `National Sports Council <${fromAddress}>`,
          to: booking.contactEmail,
          subject,
          html,
        });

        console.log(`📧 Booking cancellation email sent to ${booking.contactEmail}`);
      } catch (err) {
        console.error("Failed to send booking cancellation email:", err);
      }
    }
  }

  return NextResponse.json({
    success: true,
    message,
    booking: {
      _id: booking._id.toString(),
      status: booking.status,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      amenities: (booking.amenities || []).map((a: any) => a.toString()),
      basePrice: booking.basePrice,
      amenitySurcharge: booking.amenitySurcharge,
      taxAmount: booking.taxAmount ?? 0,
      totalPrice: booking.totalPrice,
      paymentStatus: booking.paymentStatus,
      totalPaid: booking.totalPaid,
      remainingBalance: booking.remainingBalance,
      payments: booking.payments,
      statusHistory: booking.statusHistory.map((h: any) => ({
        status: h.status,
        changedBy: h.changedBy.toString(),
        changedAt: h.changedAt.toISOString(),
        reason: h.reason,
      })),
    },
  });
}