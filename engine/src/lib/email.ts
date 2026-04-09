// src/lib/email.ts
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import Facility from '@/models/Facility';
import BookingConfirmation from '@/emails/BookingConfirmation';
import NewBookingNotification from '@/emails/NewBookingNotification';
import Settings from '@/models/Settings';

export async function sendBookingNotifications(booking: any, venueName: string) {
    const settings = await Settings.findOne().lean();

    // ── Guard: email must be enabled globally + bookingCreated event must be on ──
    if (!settings?.notifications?.emailEnabled) {
        console.info('📧 Emails disabled in settings — skipping booking notification');
        return;
    }
    if (settings?.notifications?.events?.bookingCreated === false) {
        console.info('📧 bookingCreated notification disabled in settings — skipping');
        return;
    }

    if (!settings?.smtp?.host) {
        console.error('⚠️ No SMTP host configured — skipping emails');
        return;
    }

    const smtpDebug = settings.smtpDebug ?? false;

    const transporter = nodemailer.createTransport({
        host: settings.smtp.host,
        port: settings.smtp.port,
        // Use the admin-configured secure flag (was previously hardcoded to true)
        secure: settings.smtp.secure ?? true,
        auth: settings.smtp.user
            ? { user: settings.smtp.user, pass: settings.smtp.pass }
            : undefined,
        debug: smtpDebug,
        logger: smtpDebug,
    });

    const dateStr = new Date(booking.startTime).toLocaleDateString(
        settings.locale || 'en-SB',
        {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }
    );

    const bookingId = booking.invoiceId || booking._id?.toString() || 'NSC-Booking';

    // Use smtp.from from settings (fall back to env var for backwards compat)
    const fromAddress = settings.smtp.from || process.env.EMAIL_FROM || settings.smtp.user || 'noreply@nsc.gov.sb';

    // Fetch manager emails dynamically from facility.managerIds
    let managerEmails: string[] = [];

    if (booking.facilityId) {
        const facility = await Facility.findById(booking.facilityId)
            .populate('managerIds', 'email')
            .lean();

        if (facility && facility.managerIds) {
            managerEmails = (facility.managerIds as any[])
                .map((manager: any) => manager.email)
                .filter(Boolean);
        }
    }

    if (managerEmails.length === 0) {
        managerEmails = ['admin@nsc.gov.sb'];
    }

    // 1. Render customer email
    const customerHtml = await render(
        BookingConfirmation({
            bookingId,
            venueName,
            date: dateStr,
            totalPrice: booking.totalPrice || 0,
        })
    );

    // 2. Send to Customer
    await transporter.sendMail({
        from: `National Sports Council <${fromAddress}>`,
        to: booking.contactEmail,
        subject: `Booking Request Received - ${bookingId}`,
        html: customerHtml,
    });

    // 3. Render & send to Managers
    const managerHtml = await render(
        NewBookingNotification({
            bookingId,
            customerName: booking.contactName || 'Customer',
            venueName,
            date: dateStr,
            totalPrice: booking.totalPrice || 0,
        })
    );

    await transporter.sendMail({
        from: `National Sports Council <${fromAddress}>`,
        to: managerEmails,
        subject: `New Booking Request - ${bookingId}`,
        html: managerHtml,
    });

    console.log(`📧 Emails sent for booking ${bookingId}`);
}

/** Shared helper: build a Nodemailer transporter from DB settings */
export async function createTransporterFromSettings() {
    const settings = await Settings.findOne().lean();
    if (!settings?.smtp?.host) return null;

    const smtpDebug = settings.smtpDebug ?? false;

    return nodemailer.createTransport({
        host: settings.smtp.host,
        port: settings.smtp.port,
        secure: settings.smtp.secure ?? true,
        auth: settings.smtp.user
            ? { user: settings.smtp.user, pass: settings.smtp.pass }
            : undefined,
        debug: smtpDebug,
        logger: smtpDebug,
    });
}