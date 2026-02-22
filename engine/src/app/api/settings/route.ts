import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  await dbConnect();
  const s = await Settings.findOne().lean();
  return NextResponse.json(s || {});
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await dbConnect();
  const body = await req.json();
  let s = await Settings.findOne();
  if (!s) {
    s = new Settings();
  }

  // Merge allowed sections rather than overwrite entire doc unintentionally
  if (body.smtp) s.smtp = { ...s.smtp, ...body.smtp };
  if (body.appUrl !== undefined) s.appUrl = body.appUrl;
  if (body.templates) s.templates = { ...s.templates, ...body.templates };
  if (body.notifications) s.notifications = { ...s.notifications, ...body.notifications };
  if (body.bookingPolicies) s.bookingPolicies = { ...s.bookingPolicies, ...body.bookingPolicies };
  if (body.timezone !== undefined) s.timezone = body.timezone;
  if (body.locale !== undefined) s.locale = body.locale;
  if (body.currency !== undefined) s.currency = body.currency;
  if (body.paymentGateway) s.paymentGateway = { ...s.paymentGateway, ...body.paymentGateway };
  if (body.defaultPricing) s.defaultPricing = { ...s.defaultPricing, ...body.defaultPricing };
  if (body.smtpDebug !== undefined) s.smtpDebug = !!body.smtpDebug;

  await s.save();
  return NextResponse.json({ success: true, settings: s });
}
