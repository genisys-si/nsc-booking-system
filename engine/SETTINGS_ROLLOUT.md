# Settings Rollout Status

This document tracks which settings have been integrated into the application and where they're used.

## Settings Model

Location: `src/models/Settings.ts`

**Available Settings:**
- `smtp`: SMTP server configuration (host, port, secure, user, pass, from)
- `appUrl`: Application base URL
- `templates.*`: Email templates with placeholder support:
  - `resetEmailSubject`, `resetEmailHtml`
  - `bookingConfirmationSubject`, `bookingConfirmationHtml`
  - `paymentReceiptSubject`, `paymentReceiptHtml`
- `notifications.*`: Notification toggles
  - `emailEnabled`: Master email toggle (default: true)
  - `smsEnabled`: SMS toggle (default: false)
  - `events.*`: Specific event toggles (bookingCreated, bookingConfirmed, bookingCancelled)
- `bookingPolicies.*`: Booking enforcement rules
  - `minLeadTimeHours`: Minimum booking advance notice (default: 2 hours)
  - `maxDurationHours`: Maximum booking duration (default: 12 hours)
  - `bufferMinutes`: Buffer time between consecutive bookings (default: 0)
  - `cancellationWindowHours`: Window for cancellations (default: 24 hours)
- `timezone`: Application timezone (default: UTC)
- `locale`: Application locale (default: en)
- `currency`: Currency code (default: SBD)
- `paymentGateway.*`: Payment provider configuration
  - `provider`: Provider name (e.g., "stripe", "paypal")
  - `apiKey`: API key for provider
  - `testMode`: Test mode toggle (default: true)
- `defaultPricing.*`: System-wide pricing defaults
  - `defaultPricePerHour`: Base hourly rate (default: 0)
  - `taxPercent`: Tax percentage (default: 0)
- `smtpDebug`: Debug SMTP operations (default: false)

## API Endpoints

**Admin-only Settings Management:**
- `GET /api/settings` — Retrieve current settings (any authenticated user)
- `PATCH /api/settings` — Update settings (admin-only, merges sections)

## Rollout Checklist

### ✅ Email Templates & Notifications (COMPLETED)

**Password Reset Flow**
- **File:** `src/app/api/auth/password-reset/request/route.ts`
- **Implementation:**
  - Loads `Settings` for SMTP config and templates
  - Uses `templates.resetEmailSubject` and `templates.resetEmailHtml`
  - Implements template placeholder rendering: `{{resetUrl}}`, `{{userName}}`, `{{appName}}`
  - Respects `notifications.emailEnabled` toggle
  - Uses `appUrl` from settings if available
- **Status:** ✅ Integrated

**Booking Creation Confirmation Email**
- **File:** `src/app/api/bookings/route.ts` (POST handler)
- **Implementation:**
  - Sends booking confirmation email immediately after booking creation
  - Uses `templates.bookingConfirmationSubject` and `templates.bookingConfirmationHtml`
  - Renders placeholders: `{{bookingRef}}`, `{{venueName}}`, `{{userName}}`, `{{startTime}}`, `{{endTime}}`, `{{dashboardUrl}}`, `{{totalPrice}}`
  - Respects `notifications.emailEnabled` toggle
- **Status:** ✅ Integrated

**Booking Confirmation (Admin Action)**
- **File:** `src/app/api/bookings/[id]/route.ts` (PATCH handler, action=confirm)
- **Implementation:**
  - Sends confirmation email when booking status changes to "confirmed"
  - Uses same templates and placeholder rendering as creation flow
  - Only triggers on "confirm" action
  - Respects `notifications.emailEnabled` toggle
- **Status:** ✅ Integrated

### ✅ Booking Policy Enforcement (COMPLETED)

**Booking Validation**
- **File:** `src/app/api/bookings/route.ts` (POST handler)
- **Policies Enforced:**
  - `minLeadTimeHours`: Prevents bookings less than configured hours in advance
  - `maxDurationHours`: Rejects bookings exceeding maximum duration
  - `bufferMinutes`: Adds buffer time between bookings when checking availability
- **Status:** ✅ Integrated

### ⏳ Payment Gateway Integration (PENDING)

**Current State:** Payment gateway settings defined but not yet wired to payment flows.

**Required Implementation:**
- Update payment checkout pages to read `paymentGateway.provider` and `paymentGateway.apiKey`
- Implement provider-specific checkout based on selected gateway (e.g., Stripe, PayPal)
- Use `defaultPricing.defaultPricePerHour` and `defaultPricing.taxPercent` when calculating prices
- Store `paymentGateway.testMode` selection and use for sandbox/production switching

### ⏳ Invoice Branding & Localization (PENDING)

**Current State:** Invoice templates hardcoded to NSC; locale/timezone/currency not used.

**Required Implementation:**
- Update `src/lib/invoice.tsx` to accept Settings as parameter
- Use `settings.appUrl` for company name in header
- Use `settings.locale` for date/number formatting
- Use `settings.timezone` for time display
- Use `settings.currency` for all monetary amounts
- Pass settings through invoice API route (`src/app/api/bookings/[id]/invoice/route.ts`)

**Estimated difficulty:** Medium (requires refactoring React component PDF generation to accept async settings)

### ⏳ Notification Event Toggles (PARTIALLY IMPLEMENTED)

**Current State:** Settings defines event toggles but they are not yet checked.

**Required Implementation:**
- Add checks for `notifications.events.bookingCreated` before sending creation email
- Add checks for `notifications.events.bookingConfirmed` before sending confirmation email
- Add checks for `notifications.events.bookingCancelled` before sending cancellation email (implement cancellation email first)

### ⏳ Timezone & Locale Usage (PENDING)

**Current State:** Settings store these values but they don't affect date/time display.

**Required Implementation:**
- Use `settings.timezone` in date formatting for invoices
- Use `settings.locale` for internationalized date/time in UI
- Apply locale to currency formatting throughout the app
- Update booking list/detail pages to display times in correct timezone

### ⏳ Default Pricing (PENDING)

**Current State:** `defaultPricing.defaultPricePerHour` and `defaultPricing.taxPercent` are stored but unused.

**Required Implementation:**
- Use `defaultPricing.defaultPricePerHour` when venue price isn't set
- Apply `defaultPricing.taxPercent` when calculating totals
- Update facility/venue edit forms to pre-populate with defaults
- Display defaults in pricing UI

### ⏳ Cancellation Policy Enforcement (NOT STARTED)

**Current State:** `bookingPolicies.cancellationWindowHours` is defined but not used.

**Files Requiring Updates:**
- Booking cancellation handler (implement cancellation email)
- Booking detail page (show cancellation eligibility to users)

**Implementation:**
- Check if cancellation is within the policy window
- Prevent cancellation if outside window (with appropriate error)
- Calculate refund amount based on policy

### ⏳ Payment Receipt Emails (NOT STARTED)

**Current State:** Template defined but not sent.

**Files Requiring Updates:**
- Booking payment recording endpoints (`src/app/api/bookings/[id]/route.ts` - payment actions)

**Implementation:**
- Send payment receipt email after payment is recorded
- Use `templates.paymentReceiptSubject` and `templates.paymentReceiptHtml`
- Include payment amount, method, booking ref, etc.

## Settings UI

**Location:** `src/components/dashboard/SettingsForm.tsx` and `src/app/dashboard/settings/page.tsx`

**Available in UI:** All settings sections with form controls for editing.

**Admin Access Required:** Yes (managed in access control layer)

## Summary

### Completed (3/13)
- ✅ Email templates with placeholder replacement
- ✅ Booking policy enforcement (lead time, duration, buffer)
- ✅ SMTP configuration and password reset emails
- ✅ Booking confirmation emails (creation & status change)

### In Progress (0/13)
- None

### Pending (10/13)
- Payment gateway integration
- Invoice branding & localization
- Notification event toggles enforcement
- Timezone & locale usage throughout app
- Default pricing application
- Cancellation policy enforcement & cancellation emails
- Payment receipt emails
- SMS notification support
- Template preview/validation UI
- Bulk email settings per event type
- Rate limiting for email sends

## Next Priority Actions

1. **Quick Win:** Implement notification event toggles (add simple if-checks where emails are sent)
2. **Medium Effort:** Implement payment receipt emails (similar to confirmation emails)
3. **High Impact:** Implement timezone/locale formatting across booking list, detail, and invoices
4. **High Value:** Wire payment gateway provider selection and API key usage
5. **Polish:** Add template preview pane in settings UI to test placeholders

## Testing Checklist

Before rollout to production, verify:
- [ ] Password reset email uses custom template when configured
- [ ] Booking creation email sends with custom template
- [ ] Booking confirmation email sends when status changes
- [ ] Email sending is skipped when `notifications.emailEnabled = false`
- [ ] Bookings can't be created with less than `minLeadTimeHours`
- [ ] Bookings can't exceed `maxDurationHours`
- [ ] Buffer time is applied between bookings
- [ ] Settings panel allows editing all sections
- [ ] Settings persist across page reloads
- [ ] Non-admin users cannot access settings

