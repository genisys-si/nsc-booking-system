// src/app/api/availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Settings from "@/models/Settings";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  // Optional: exclude a specific booking (used when editing an existing booking)
  const excludeBookingId = searchParams.get("excludeBookingId");

  if (!venueId || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: "Invalid date/time range" }, { status: 400 });
  }

  // Expand checked window by bufferMinutes from settings (consistent with booking creation)
  const settings = await Settings.findOne().lean();
  const bufferMs = (settings?.bookingPolicies?.bufferMinutes || 0) * 60 * 1000;
  const bufferedStart = new Date(start.getTime() - bufferMs);
  const bufferedEnd = new Date(end.getTime() + bufferMs);

  // Build filter — optionally exclude the booking being edited
  const filter: any = {
    venueId,
    status: { $nin: ["cancelled", "rejected"] },
    $or: [{ startTime: { $lt: bufferedEnd }, endTime: { $gt: bufferedStart } }],
  };

  if (excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId)) {
    filter._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
  }

  const overlapping = await Booking.find(filter).lean();

  const isAvailable = overlapping.length === 0;

  return NextResponse.json({
    available: isAvailable,
    bufferMinutes: settings?.bookingPolicies?.bufferMinutes || 0,
    conflictingBookings: overlapping.map(b => ({
      _id: b._id.toString(),
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: b.status,
    })),
  });
}