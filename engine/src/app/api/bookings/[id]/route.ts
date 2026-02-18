import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const body = await req.json();
  const { action, reason, paymentMethod, paidAmount } = body;

  const booking = await Booking.findById((await params).id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // todo: Check authorization (admin or manager of this facility)

  if (action === "mark-paid") {
    if (booking.paymentStatus === "paid") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }

    booking.paymentStatus = "paid";
    booking.paymentMethod = paymentMethod || "cash";
    booking.paidAmount = paidAmount || booking.totalPrice;
    booking.paymentDate = new Date();

    // Record in history
    booking.statusHistory = booking.statusHistory || [];
    booking.statusHistory.push({
      status: booking.status,
      changedBy: session.user.id,
      changedAt: new Date(),
      reason: reason || "Payment received",
    });

    await booking.save();

    return NextResponse.json({
      success: true,
      message: "Payment marked as paid",
      booking: {
        _id: booking._id.toString(),
        paymentStatus: booking.paymentStatus,
        paidAmount: booking.paidAmount,
      },
    });
  }

  // Status actions: confirm, reject, cancel
  const validActions = ["confirm", "reject", "cancel"];
  if (validActions.includes(action)) {
    const newStatus = {
      confirm: "confirmed",
      reject: "rejected",
      cancel: "cancelled",
    }[action as "confirm" | "reject" | "cancel"];

    // Record history
    booking.statusHistory = booking.statusHistory || [];
    booking.statusHistory.push({
      status: newStatus,
      changedBy: session.user.id,
      changedAt: new Date(),
      reason: reason || undefined,
    });

    booking.status = newStatus;

    await booking.save();

    return NextResponse.json({
      success: true,
      message: `Booking ${action}ed`,
      booking: {
        _id: booking._id.toString(),
        status: booking.status,
      },
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}