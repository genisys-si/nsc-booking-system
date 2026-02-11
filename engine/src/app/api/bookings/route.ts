import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Booking from '@/models/Booking';
import Facility from '@/models/Facility';
import { isVenueAvailable } from '@/lib/availability';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // your NextAuth config

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  // Allow public/unauthenticated requests → pending status (optional: require login later)
  // if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const body = await req.json();

  const {
    facilityId,
    venueId,
    startTime,
    endTime,
    purpose,
    attendees,
    contactName,
    contactEmail,
    notes,
  } = body;

  if (!facilityId || !venueId || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
  }

  // Validate facility & venue exists and is bookable
  const facility = await Facility.findById(facilityId);
  if (!facility) return NextResponse.json({ error: 'Facility not found' }, { status: 404 });

  const venue = facility.venues.id(venueId);
  if (!venue || !venue.isBookable) {
    return NextResponse.json({ error: 'Venue not found or not bookable' }, { status: 400 });
  }

  // Availability check
  const available = await isVenueAvailable(venueId.toString(), start, end);
  if (!available) {
    return NextResponse.json({ error: 'Time slot overlaps with existing booking' }, { status: 409 });
  }

  // Create pending booking
  const booking = await Booking.create({
    userId: session?.user?.id || null, // null if public submission
    facilityId,
    venueId,
    startTime: start,
    endTime: end,
    purpose,
    attendees,
    contactName,
    contactEmail,
    notes,
    status: 'pending',
  });

  return NextResponse.json({
    success: true,
    bookingId: booking._id,
    message: 'Booking request submitted (pending approval)',
  }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  let filter: any = {};

  if (session.user.role === 'manager') {
    const managedFacility = await Facility.findOne({ managerIds: session.user.id });
    if (managedFacility) {
      filter.facilityId = managedFacility._id;
    } else {
      return NextResponse.json([]);
    }
  } else if (session.user.role === 'user') {
    filter.userId = session.user.id;
  }
  // admin → no filter

  const bookings = await Booking.find(filter)
    .populate('userId', 'name email')
    .sort({ startTime: -1 })
    .lean();

  return NextResponse.json(bookings);
}