// src/app/api/bookings/booked-dates/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");

  if (!venueId) {
    return NextResponse.json({ error: "Venue ID required" }, { status: 400 });
  }

  // TODO: Fetch actual booked dates from your database for this venue
  // Example: const bookings = await db.collection('bookings').find({ venueId }).toArray();
  // const dates = bookings.map(b => b.date);
  
  // Returning empty array for now to fix the 405 error
  return NextResponse.json({ dates: [] });
}
