import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Booking from '@/models/Booking';
import Facility from '@/models/Facility';
import Settings from '@/models/Settings';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendBookingNotifications } from '@/lib/email';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  // Allow public/unauthenticated requests → treat as guest (pending)
  // proceed even if no session; `userId` will be saved as `null`
  // middleware may attach `x-user` header when a valid JWT is provided
  let xUser: any = null;
  try {
    const xu = req.headers.get('x-user');
    if (xu) xUser = JSON.parse(xu);
  } catch (e) {
    // ignore parse errors
  }

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
    skipAvailabilityCheck = false, // For testing, default to false to enforce availability check
  } = body;

  // Support both `amenities` and `selectedAmenities` from clients
  const amenities = Array.isArray(body.amenities)
    ? body.amenities
    : Array.isArray(body.selectedAmenities)
      ? body.selectedAmenities
      : [];

  if (!facilityId || !venueId || !startTime || !endTime || !contactName || !contactEmail) {
    console.error('❌ Missing required fields:', { facilityId, venueId, startTime, endTime, contactName, contactEmail });
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('❌ Invalid dates provided:', { startTime, endTime });
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  if (end <= start) {
    console.error('❌ End time before start time:', { start: start.toISOString(), end: end.toISOString() });
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
  }

  // Load settings once for booking policy validation and email sending
  const settings = await Settings.findOne().lean();

  // ── Booking Policies ──────────────────────────────────────────────────────

  // Check minimum lead time policy
  if (settings?.bookingPolicies?.minLeadTimeHours) {
    const minLeadTime = new Date(Date.now() + settings.bookingPolicies.minLeadTimeHours * 60 * 60 * 1000);
    if (start < minLeadTime) {
      console.error('❌ Policy Violation: Minimum lead time not met', { 
        start: start.toISOString(), 
        minLeadTime: minLeadTime.toISOString(),
        requiredHours: settings.bookingPolicies.minLeadTimeHours 
      });
      return NextResponse.json({
        error: `Booking must be made at least ${settings.bookingPolicies.minLeadTimeHours} hours in advance`,
        type: 'POLICY_VIOLATION'
      }, { status: 400 });
    }
  }

  const facility = await Facility.findById(facilityId);
  if (!facility) {
    console.error('❌ Facility not found:', facilityId);
    return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
  }

  const venue = facility.venues.id(venueId);
  if (!venue || !venue.isBookable) {
    console.error('❌ Venue not found or not bookable:', { venueId, isBookable: venue?.isBookable });
    return NextResponse.json({ 
      error: venue ? 'Venue is currently not available for booking' : 'Venue not found',
      type: venue ? 'VENUE_UNAVAILABLE' : 'NOT_FOUND'
    }, { status: 400 });
  }

  // Check maximum duration policy
  const durationMs = end.getTime() - start.getTime();
  const hours = durationMs / (1000 * 60 * 60);
  if (settings?.bookingPolicies?.maxDurationHours && hours > settings.bookingPolicies.maxDurationHours) {
    console.error('❌ Policy Violation: Maximum duration exceeded', { hours, max: settings.bookingPolicies.maxDurationHours });
    return NextResponse.json({
      error: `Booking duration cannot exceed ${settings.bookingPolicies.maxDurationHours} hours`,
      type: 'POLICY_VIOLATION'
    }, { status: 400 });
  }

  // ── Availability check with buffer time ───────────────────────────────────
  if (!skipAvailabilityCheck) {
    const bufferMs = (settings?.bookingPolicies?.bufferMinutes || 0) * 60 * 1000;
    const bufferedStart = new Date(start.getTime() - bufferMs);
    const bufferedEnd = new Date(end.getTime() + bufferMs);

    const overlapping = await Booking.findOne({
      venueId,
      status: { $in: ['pending', 'confirmed'] },
      $and: [
        { startTime: { $lt: bufferedEnd } },
        { endTime: { $gt: bufferedStart } },
      ],
    });

    if (overlapping) {
      console.error('❌ OVERLAP DETECTED!', {
        requested: { start: start.toISOString(), end: end.toISOString() },
        existing: { id: overlapping._id, start: overlapping.startTime.toISOString(), end: overlapping.endTime.toISOString() }
      });
      return NextResponse.json({
        error: 'Time slot overlaps with existing booking',
        message: 'This venue is already booked during your selected time',
        conflictingBookingId: overlapping._id.toString(),
      }, { status: 409 });
    }
    console.log('✅ No overlapping confirmed bookings found');
  } else {
    console.log('⚠️ AVAILABILITY CHECK SKIPPED (for testing)');
  }

  // ── Pricing ───────────────────────────────────────────────────────────────
  // Use venue pricePerHour; fall back to settings defaultPricePerHour
  const pricePerHour = (venue.pricePerHour ?? 0) > 0
    ? venue.pricePerHour
    : (settings?.defaultPricing?.defaultPricePerHour ?? 0);

  const basePrice = hours * pricePerHour;

  let amenitySurcharge = 0;
  const validSelectedAmenities: string[] = [];

  if (amenities.length > 0 && venue.amenities?.length > 0) {
    for (const amenityId of amenities) {
      const amenity = venue.amenities.find((a: any) => a._id.toString() === amenityId.toString());

      if (amenity && typeof amenity.surcharge === 'number') {
        amenitySurcharge += amenity.surcharge;
        validSelectedAmenities.push(amenityId);
      }
    }
  }

  // Apply tax from settings
  const taxPercent = settings?.defaultPricing?.taxPercent ?? 0;
  const subtotal = basePrice + amenitySurcharge;
  const taxAmount = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const totalPrice = subtotal + taxAmount;

  // Currency from settings (fallback SBD)
  const currency = settings?.currency || 'SBD';

  // Generate a short human-friendly booking reference
  const bookingRef = `BK-${Date.now().toString(36).toUpperCase()}`;

  const booking = await Booking.create({
    userId: session?.user?.id || xUser?.id || undefined,
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
    amenities: validSelectedAmenities,
    basePrice,
    amenitySurcharge,
    taxAmount,
    totalPrice,
    invoiceId: `INV-${Date.now().toString(36).toUpperCase()}`,
    bookingRef,
    paymentStatus: 'pending',
  });

  // Send booking notifications — respects emailEnabled + bookingCreated event flag
  const venueName = venue.name || 'Unknown Venue';
  try {
    await sendBookingNotifications(booking, venueName);
  } catch (err) {
    console.error('Failed to send booking notification emails:', err);
  }

  return NextResponse.json({
    success: true,
    bookingId: booking._id,
    bookingRef: bookingRef,
    message: 'Booking request submitted (pending approval)',
    pricing: {
      hours: hours.toFixed(2),
      basePrice: basePrice.toFixed(2),
      amenitySurcharge: amenitySurcharge.toFixed(2),
      taxPercent,
      taxAmount: taxAmount.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      currency,
    },
  }, { status: 201, headers: { 'Access-Control-Allow-Origin': '*' } });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  // Allow session or JWT-provided user via middleware `x-user`
  let xUser: any = null;
  try {
    const xu = req.headers.get('x-user');
    if (xu) xUser = JSON.parse(xu);
  } catch (e) { }

  if (!session?.user && !xUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  let filter: any = {};

  const authUser = session?.user || xUser;
  if (authUser.role === 'manager') {
    const managedFacility = await Facility.findOne({ managerIds: authUser.id });
    if (managedFacility) {
      filter.facilityId = managedFacility._id;
    } else {
      return NextResponse.json([]);
    }
  } else if (authUser.role === 'user') {
    filter.userId = authUser.id;
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
      select: 'name pricePerHour amenities',
    })
    .sort({ startTime: -1 })
    .lean();

  // Map to ensure paymentStatus is always included
  const mappedBookings = bookings.map((b: any) => ({
    ...b,
    paymentStatus: b.paymentStatus || 'pending',
  }));

  // Ensure bookingRef is present on each returned booking for UI tables
  const withRefs = mappedBookings.map((b: any) => ({
    ...b,
    bookingRef: b.bookingRef || null,
  }));

  return NextResponse.json(withRefs);
}