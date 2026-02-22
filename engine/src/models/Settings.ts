import mongoose, { Schema } from 'mongoose';

export interface ISMTPSettings {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

const settingsSchema = new Schema({
  smtp: {
    host: String,
    port: Number,
    secure: Boolean,
    user: String,
    pass: String,
    from: String,
  },
  // App-wide settings
  appUrl: String,
  // Email templates
  templates: {
    resetEmailSubject: { type: String, default: 'Password reset' },
    resetEmailHtml: { type: String, default: '<p>Reset: {{resetUrl}}</p>' },
    bookingConfirmationSubject: { type: String, default: 'Booking confirmation' },
    bookingConfirmationHtml: { type: String, default: '<p>Your booking is confirmed</p>' },
    paymentReceiptSubject: { type: String, default: 'Payment receipt' },
    paymentReceiptHtml: { type: String, default: '<p>Payment received</p>' },
  },
  // Notification toggles and events
  notifications: {
    emailEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false },
    events: {
      bookingCreated: { type: Boolean, default: true },
      bookingConfirmed: { type: Boolean, default: true },
      bookingCancelled: { type: Boolean, default: true },
    }
  },
  // Booking policy
  bookingPolicies: {
    cancellationWindowHours: { type: Number, default: 24 },
    maxDurationHours: { type: Number, default: 12 },
    minLeadTimeHours: { type: Number, default: 2 },
    bufferMinutes: { type: Number, default: 0 },
  },
  // Locale / timezone / currency
  timezone: { type: String, default: 'UTC' },
  locale: { type: String, default: 'en' },
  currency: { type: String, default: 'SBD' },
  // Payment gateway (basic)
  paymentGateway: {
    provider: String,
    apiKey: String,
    testMode: { type: Boolean, default: true },
  },
  // Default pricing
  defaultPricing: {
    defaultPricePerHour: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 0 },
  },
  // Debug options
  smtpDebug: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
