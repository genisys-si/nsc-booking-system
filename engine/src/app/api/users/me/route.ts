import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const u = await User.findById(session.user.id).select('name email phone role isActive createdAt lastLogin').lean();
  if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ user: u });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const body = await req.json();
  const update: any = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.phone !== undefined) update.phone = body.phone;
  if (body.password) update.password = await bcrypt.hash(body.password, 10);

  const updated = await User.findByIdAndUpdate(session.user.id, { $set: update }, { returnDocument: 'after' }).select('name email phone role isActive createdAt lastLogin');
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, user: updated });
}
