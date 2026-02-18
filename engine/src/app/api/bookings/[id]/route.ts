// src/app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Facility from "@/models/Facility";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

  let message = "";

  switch (action) {
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

    case "cancel":
      if (booking.status === "cancelled") {
        return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
      }
      booking.status = "cancelled";
      message = "Booking cancelled";
      break;

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

    case "record-payment":
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

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Record the change in history
  booking.statusHistory = booking.statusHistory || [];
  booking.statusHistory.push({
    status: booking.status,
    changedBy: session.user.id,
    changedAt: new Date(),
    reason: reason || (action === "record-payment" ? "Payment received" : undefined),
  });

  await booking.save();

  return NextResponse.json({
    success: true,
    message,
    booking: {
      _id: booking._id.toString(),
      status: booking.status,
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