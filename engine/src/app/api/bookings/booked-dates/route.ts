// src/app/api/bookings/booked-dates/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";

// Public: returns upcoming booked time ranges for a venue so the booking wizard can
// grey out taken slots. Only times are exposed — no customer details.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");

  if (!venueId || !mongoose.Types.ObjectId.isValid(venueId)) {
    return NextResponse.json({ error: "Valid venue ID required" }, { status: 400 });
  }

  await dbConnect();

  const bookings = await Booking.find({
    venueId,
    status: { $nin: ["cancelled", "rejected"] },
    endTime: { $gt: new Date() },
  })
    .select("startTime endTime")
    .sort({ startTime: 1 })
    .lean();

  return NextResponse.json({
    bookings: bookings.map(b => ({
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
    })),
  });
}
