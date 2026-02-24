// src/app/api/availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";

export async function GET(request: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");

  if (!venueId || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: "Invalid date/time range" }, { status: 400 });
  }

  // Find overlapping bookings
  const overlapping = await Booking.find({
    venueId,
    status: { $nin: ["cancelled", "rejected"] },
    $or: [
      { startTime: { $lt: end }, endTime: { $gt: start } },
    ],
  }).lean();

  const isAvailable = overlapping.length === 0;

  return NextResponse.json({
    available: isAvailable,
    conflictingBookings: overlapping.map(b => ({
      _id: b._id.toString(),
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: b.status,
    })),
  });
}