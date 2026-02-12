import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Booking from '@/models/Booking';
import { generateInvoicePDF } from '@/lib/invoice';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();

  const booking = await Booking.findById(params.id)
    .populate('facilityId venueId userId')
    .lean();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Generate PDF buffer
  const pdfBuffer = await generateInvoicePDF(booking);

  // Convert Node.js Buffer → Uint8Array (what Response likes)
  const uint8Array = new Uint8Array(pdfBuffer);

  return new NextResponse(uint8Array, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${booking._id || 'booking'}.pdf"`,
    },
  });
}