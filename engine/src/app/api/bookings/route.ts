import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Booking from '@/models/Booking';
import Facility from '@/models/Facility';
import { isVenueAvailable } from '@/lib/availability';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  // Allow public/unauthenticated requests → pending status
  // Uncomment next line if you want to force login
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
    selectedAmenities = [], // array of amenity _ids chosen by user
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

  // ───────────────────────────────────────────────
  // Pricing calculation
  // ───────────────────────────────────────────────
  const durationMs = end.getTime() - start.getTime();
  const hours = durationMs / (1000 * 60 * 60); // duration in hours

  const basePrice = hours * (venue.pricePerHour || 0);

  // Calculate surcharge for selected amenities
  let amenitySurcharge = 0;
  const validSelectedAmenities: string[] = [];

  if (selectedAmenities.length > 0 && venue.amenities?.length > 0) {
    for (const amenityId of selectedAmenities) {
      const amenity = venue.amenities.id(amenityId);
      if (amenity && amenity.surcharge) {
        amenitySurcharge += amenity.surcharge;
        validSelectedAmenities.push(amenityId);
      }
    }
  }

  const totalPrice = basePrice + amenitySurcharge;

  // Create pending booking with pricing info
  const booking = await Booking.create({
    userId: session?.user?.id || null,
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
    //pricing fields
    selectedAmenities: validSelectedAmenities,
    basePrice,
    amenitySurcharge,
    totalPrice,
    invoiceId: `INV-${Date.now().toString(36).toUpperCase()}`, // short unique ID
  });

  return NextResponse.json({
    success: true,
    bookingId: booking._id,
    message: 'Booking request submitted (pending approval)',
    // Useful for frontend preview
    pricing: {
      hours: hours.toFixed(2),
      basePrice: basePrice.toFixed(2),
      amenitySurcharge: amenitySurcharge.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      currency: 'SBD',
    },
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
    .populate({
      path: 'facilityId',
      select: 'name',
    })
    .populate({
      path: 'venueId',
      select: 'name pricePerHour',
    })
    .sort({ startTime: -1 })
    .lean();

  return NextResponse.json(bookings);
}