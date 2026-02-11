import Booking from '@/models/Booking';
import dbConnect from '@/lib/db';

export async function isVenueAvailable(
  venueId: string,
  start: Date,
  end: Date,
  excludeBookingId?: string
): Promise<boolean> {
  await dbConnect();

  const query: any = {
    venueId,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      { startTime: { $lt: end }, endTime: { $gt: start } },
    ],
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlapping = await Booking.countDocuments(query);

  return overlapping === 0;
}