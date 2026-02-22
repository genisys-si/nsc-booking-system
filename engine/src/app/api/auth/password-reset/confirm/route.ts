import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashed, passwordResetExpires: { $gt: new Date() } });
    if (!user) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined as any;
    user.passwordResetExpires = undefined as any;
    user.lastPasswordReset = new Date();
    await user.save();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Password reset confirm error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
