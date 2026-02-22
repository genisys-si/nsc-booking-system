import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Booking from '@/models/Booking';
import Facility from '@/models/Facility';
import Settings from '@/models/Settings';
import { isVenueAvailable } from '@/lib/availability';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import nodemailer from 'nodemailer';

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
  } = body;

  // Support both `amenities` and `selectedAmenities` from clients
  const amenities = Array.isArray(body.amenities)
    ? body.amenities
    : Array.isArray(body.selectedAmenities)
    ? body.selectedAmenities
    : [];

  if (!facilityId || !venueId || !startTime || !endTime || !contactName || !contactEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
  }

  // Load settings once for booking policy validation and email sending
  const settings = await Settings.findOne().lean();

  // Check minimum lead time policy
  if (settings?.bookingPolicies?.minLeadTimeHours) {
    const minLeadTime = new Date(Date.now() + settings.bookingPolicies.minLeadTimeHours * 60 * 60 * 1000);
    if (start < minLeadTime) {
      return NextResponse.json({ 
        error: `Booking must be made at least ${settings.bookingPolicies.minLeadTimeHours} hours in advance` 
      }, { status: 400 });
    }
  }

  const facility = await Facility.findById(facilityId);
  if (!facility) return NextResponse.json({ error: 'Facility not found' }, { status: 404 });

  const venue = facility.venues.id(venueId);
  if (!venue || !venue.isBookable) {
    return NextResponse.json({ error: 'Venue not found or not bookable' }, { status: 400 });
  }

  // Check maximum duration policy
  const durationMs = end.getTime() - start.getTime();
  const hours = durationMs / (1000 * 60 * 60);
  if (settings?.bookingPolicies?.maxDurationHours && hours > settings.bookingPolicies.maxDurationHours) {
    return NextResponse.json({ 
      error: `Booking duration cannot exceed ${settings.bookingPolicies.maxDurationHours} hours` 
    }, { status: 400 });
  }

  // Check availability with optional buffer time
  const bufferMs = (settings?.bookingPolicies?.bufferMinutes || 0) * 60 * 1000;
  const bufferedStart = new Date(start.getTime() - bufferMs);
  const bufferedEnd = new Date(end.getTime() + bufferMs);
  const available = await isVenueAvailable(venueId.toString(), bufferedStart, bufferedEnd);
  if (!available) {
    return NextResponse.json({ error: 'Time slot overlaps with existing booking' }, { status: 409 });
  }

  const basePrice = hours * (venue.pricePerHour || 0);

  
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

  const totalPrice = basePrice + amenitySurcharge;



  // Generate a short human-friendly booking reference
  const bookingRef = `BK-${Date.now().toString(36).toUpperCase()}`;

  const booking = await Booking.create({
    userId: session?.user?.id || xUser?.id || null,
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
    amenities: validSelectedAmenities, // now saved correctly
    basePrice,
    amenitySurcharge,
    totalPrice,
    invoiceId: `INV-${Date.now().toString(36).toUpperCase()}`,
    bookingRef,
    paymentStatus: 'pending',
  });

  // Send booking confirmation email if enabled in Settings
  if (settings?.notifications?.emailEnabled && settings?.smtp?.host) {
    try {
      const renderTemplate = (tpl: string, vars: Record<string, string>) => {
        if (!tpl) return '';
        return tpl.replace(/{{\s*([a-zA-Z0-9_\.]+)\s*}}/g, (_, key) => {
          return (vars[key] ?? '') as string;
        });
      };

      const dashboardUrl = `${settings?.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/bookings/${booking._id}`;

      const subject = renderTemplate(settings?.templates?.bookingConfirmationSubject || 'Booking confirmation', {
        bookingRef,
        venueName: venue.name || '',
        userName: contactName,
      });

      const html = renderTemplate(settings?.templates?.bookingConfirmationHtml || '<p>Your booking is confirmed</p>', {
        bookingRef,
        venueName: venue.name || '',
        userName: contactName,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        dashboardUrl,
        totalPrice: totalPrice.toFixed(2),
      });

      const transporter = nodemailer.createTransport({
        host: settings.smtp.host,
        port: settings.smtp.port,
        secure: !!settings.smtp.secure,
        auth: settings.smtp.user ? { user: settings.smtp.user, pass: settings.smtp.pass } : undefined,
      });

      await transporter.sendMail({
        from: settings.smtp.from || settings.smtp.user,
        to: contactEmail,
        subject,
        html,
      });
    } catch (err) {
      console.error('Failed to send booking confirmation email:', err);
    }
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
      totalPrice: totalPrice.toFixed(2),
      currency: 'SBD',
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
  } catch (e) {}

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