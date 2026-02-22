import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Settings from '@/models/Settings';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Do not reveal user existence
      return NextResponse.json({ success: true });
    }

    // create token and store hashed version
    const token = crypto.randomBytes(20).toString('hex');
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    user.passwordResetToken = hashed;
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await user.save();

    // send email if SMTP configured and email notifications enabled
    const s = await Settings.findOne().lean();
    const resetUrl = `${(s?.appUrl || process.env.NEXT_PUBLIC_APP_URL) || 'http://localhost:3000'}/auth/reset/${token}`;

    const renderTemplate = (tpl: string, vars: Record<string, string>) => {
      if (!tpl) return '';
      return tpl.replace(/{{\s*([a-zA-Z0-9_\.]+)\s*}}/g, (_, key) => {
        return (vars[key] ?? '') as string;
      });
    };

    const subjectTpl = s?.templates?.resetEmailSubject || 'Password reset';
    const htmlTpl = s?.templates?.resetEmailHtml || '<p>Reset: {{resetUrl}}</p>';
    const textTpl = (htmlTpl || '').replace(/<[^>]+>/g, '').trim() || `Reset your password: ${resetUrl}`;

    const subject = renderTemplate(subjectTpl, { resetUrl, userName: user.name || '', appName: s?.appUrl || process.env.NEXT_PUBLIC_APP_URL || '' });
    const html = renderTemplate(htmlTpl, { resetUrl, userName: user.name || '', appName: s?.appUrl || process.env.NEXT_PUBLIC_APP_URL || '' });
    const text = renderTemplate(textTpl, { resetUrl, userName: user.name || '', appName: s?.appUrl || process.env.NEXT_PUBLIC_APP_URL || '' });

    if (s?.notifications?.emailEnabled && s?.smtp?.host) {
      try {
        const transporter = nodemailer.createTransport({
          host: s.smtp.host,
          port: s.smtp.port,
          secure: !!s.smtp.secure,
          auth: s.smtp.user ? { user: s.smtp.user, pass: s.smtp.pass } : undefined,
        });

        await transporter.sendMail({
          from: s.smtp.from || s.smtp.user,
          to: user.email,
          subject,
          text,
          html,
        });
      } catch (err) {
        console.error('Failed to send reset email:', err);
      }
    } else {
      // If SMTP not configured or emails disabled, log the token for debugging
      console.info('Password reset token for', user.email, '=>', token);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Password reset request error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
