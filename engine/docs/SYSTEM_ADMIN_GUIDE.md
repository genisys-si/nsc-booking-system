# NSC Booking System — System Administrator Guide

> **National Sports Council — Facility Booking Platform**
> Audience: System Administrators
> Last updated: April 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Environment Setup & Configuration](#3-environment-setup--configuration)
4. [Data Models](#4-data-models)
5. [API Reference](#5-api-reference)
6. [Admin Dashboard](#6-admin-dashboard)
7. [Settings Reference](#7-settings-reference)
8. [Email & Notification System](#8-email--notification-system)
9. [User Roles & Access Control](#9-user-roles--access-control)
10. [Booking Lifecycle](#10-booking-lifecycle)
11. [Pricing & Tax Engine](#11-pricing--tax-engine)
12. [Availability & Buffer Logic](#12-availability--buffer-logic)
13. [Invoice & PDF Generation](#13-invoice--pdf-generation)
14. [Deployment & Maintenance](#14-deployment--maintenance)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. System Overview

The NSC Booking System is a web-based facility booking and management platform built for the **National Sports Council of Solomon Islands**. It enables the public to submit facility booking requests online and allows administrators and facility managers to review, approve, track, and collect payments for those bookings via a secure dashboard.

### Key capabilities

| Capability | Description |
|---|---|
| Public booking | Anyone can submit a booking request without an account |
| Role-based dashboard | Admins see everything; managers see only their facility |
| Booking lifecycle | Pending → Confirmed / Rejected / Cancelled |
| Payment tracking | Record partial or full cash/bank payments |
| Email notifications | SMTP-based emails on booking creation, confirmation, and cancellation |
| Policy enforcement | Lead time, max duration, buffer minutes, cancellation window — all configurable |
| Pricing & tax | Per-venue hourly rates + amenity surcharges + configurable tax percentage |
| PDF invoices | React-PDF generated invoices downloadable from the booking detail page |

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| UI | shadcn/ui components, Tailwind CSS |
| Database | MongoDB (via Mongoose ODM) |
| Authentication | NextAuth.js (JWT sessions, Credentials provider) |
| Email | Nodemailer (SMTP — configured from DB settings) |
| Email Templates | React Email (`@react-email/render`) |
| PDF Generation | `@react-pdf/renderer` |
| Dev Server | `npm run dev` (Turbopack) |

---

## 3. Environment Setup & Configuration

### Required environment variables (`.env` file)

```env
# MongoDB connection string
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<dbname>

# NextAuth
NEXTAUTH_URL=http://localhost:3000          # Must match the deployed URL in production
NEXTAUTH_SECRET=<random-32-char-string>    # Generate: openssl rand -base64 32

# Optional legacy fallback (SMTP from address)
EMAIL_FROM=noreply@nsc.gov.sb

# Public URL (used by the public booking widget)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Important:** `NEXTAUTH_URL` must be updated to the production domain on deploy. Mismatch causes `CLIENT_FETCH_ERROR` on login.

### Starting the development server

```bash
cd engine
npm install
npm run dev          # Starts on http://localhost:3000
```

### Creating the first admin user

The system uses credential-based authentication. Create the first admin directly in MongoDB:

```js
// MongoDB Shell
db.users.insertOne({
  name: "Super Admin",
  email: "admin@nsc.gov.sb",
  password: "<bcrypt-hashed-password>",   // bcryptjs.hashSync("password", 10)
  role: "admin",
  createdAt: new Date()
})
```

---

## 4. Data Models

### User
| Field | Type | Description |
|---|---|---|
| `name` | String | Full name |
| `email` | String | Unique login email |
| `password` | String | bcrypt hashed |
| `role` | String | `admin` \| `manager` \| `user` |
| `lastLogin` | Date | Auto-updated on sign-in |
| `passwordResetToken` | String | SHA-256 hashed reset token |
| `passwordResetExpires` | Date | Expiry (1 hour from issue) |

### Facility
| Field | Type | Description |
|---|---|---|
| `name` | String | Facility display name |
| `location` | String | Physical address |
| `status` | String | `active` \| `inactive` \| `maintenance` \| `closed` |
| `managerIds` | ObjectId[] | References to User documents |
| `venues` | Venue[] | Sub-documents (see below) |
| `contactPhone` | String | — |
| `contactEmail` | String | — |
| `coverImage` | String | URL |
| `galleryImages` | String[] | URLs |
| `coordinates` | `{lat, lng}` | Optional geo coordinates |

#### Venue (sub-document of Facility)
| Field | Type | Description |
|---|---|---|
| `name` | String | Venue name (e.g. "Main Stadium") |
| `capacity` | Number | Max attendees |
| `isBookable` | Boolean | Must be `true` to accept bookings |
| `pricePerHour` | Number | Hourly rate (currency from settings) |
| `pricePerDay` | Number | Daily rate (informational only) |
| `amenities` | Amenity[] | Sub-documents |

#### Amenity (sub-document of Venue)
| Field | Type | Description |
|---|---|---|
| `name` | String | e.g. "Sound System" |
| `description` | String | Optional |
| `surcharge` | Number | Fixed add-on amount per booking |

### Booking
| Field | Type | Description |
|---|---|---|
| `userId` | ObjectId | Optional — null for guest bookings |
| `facilityId` | ObjectId | Facility reference |
| `venueId` | ObjectId | Venue `_id` (nested in facility) |
| `startTime` / `endTime` | Date | Booking window |
| `status` | String | `pending` \| `confirmed` \| `rejected` \| `cancelled` |
| `amenities` | ObjectId[] | Selected amenity IDs |
| `basePrice` | Number | `hours × pricePerHour` |
| `amenitySurcharge` | Number | Sum of selected amenity surcharges |
| `taxAmount` | Number | Calculated from `settings.defaultPricing.taxPercent` |
| `totalPrice` | Number | `basePrice + amenitySurcharge + taxAmount` |
| `paymentStatus` | String | `pending` \| `paid` \| `failed` \| `refunded` |
| `payments` | Payment[] | Partial payment records |
| `totalPaid` | Number | Running sum of recorded payments |
| `remainingBalance` | Number | `totalPrice - totalPaid` |
| `bookingRef` | String | Human-friendly ref e.g. `BK-M3F2A1` |
| `invoiceId` | String | Invoice reference e.g. `INV-M3F2A1` |
| `statusHistory` | History[] | Audit trail of all status changes |

### Settings (singleton document)
See [Settings Reference](#7-settings-reference) for full details.

---

## 5. API Reference

All API routes live under `/api/`.

### Authentication
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/signin` | Public | NextAuth sign-in |
| `POST` | `/api/auth/signout` | Authenticated | Sign out |
| `POST` | `/api/auth/password-reset/request` | Public | Send password reset email |
| `POST` | `/api/auth/password-reset/confirm` | Public | Confirm reset with token |
| `POST` | `/api/auth/signup` | Public | Register new user |

### Bookings
| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/bookings` | Public | Create a new booking request |
| `GET` | `/api/bookings` | Admin/Manager/User | List bookings (role-filtered) |
| `PATCH` | `/api/bookings/[id]` | Admin/Manager | Perform booking action (see below) |
| `GET` | `/api/bookings/[id]` | Admin/Manager | — *(fetched server-side on detail page)* |

#### PATCH `/api/bookings/[id]` — Actions
Send `{ "action": "<action>", ...fields }` in the request body.

| Action | Required fields | Description |
|---|---|---|
| `edit` | `startTime`, `endTime` | Update dates, amenities, contact info |
| `confirm` | — | Approve a pending booking |
| `reject` | — | Reject a pending booking |
| `cancel` | — | Cancel a booking (enforces `cancellationWindowHours`) |
| `record-payment` | `amount`, `method` | Record a partial/full payment |
| `mark-paid` | `paidAmount`, `paymentMethod` | Mark as fully paid |

### Facilities
| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/api/facilities` | Public | List all bookable facilities |
| `POST` | `/api/facilities` | Admin | Create facility |
| `GET` | `/api/facilities/[id]` | Public | Get facility details |
| `PATCH` | `/api/facilities/[id]` | Admin | Update facility |
| `DELETE` | `/api/facilities/[id]` | Admin | Delete facility |

### Availability
| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/api/availability` | Public | Check if a venue is available (respects `bufferMinutes`) |

Query params: `venueId`, `startTime`, `endTime`, `excludeBookingId` (optional)

### Settings
| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/api/settings` | Public | Read current settings |
| `PATCH` | `/api/settings` | Admin only | Update one or more settings sections |

### Users
| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List all users |
| `PATCH` | `/api/users/[id]` | Admin | Update user role or details |
| `DELETE` | `/api/users/[id]` | Admin | Remove user |

---

## 6. Admin Dashboard

Access at `/dashboard` — requires authentication.

### Navigation (Admin)

| Section | URL | Access |
|---|---|---|
| My Facilities | `/dashboard/facilities` | Admin + Manager |
| Bookings | `/dashboard/bookings` | Admin + Manager |
| Users | `/dashboard/users` | **Admin only** |
| Profile | `/dashboard/profile` | All |
| Settings | `/dashboard/settings` | **Admin only** |

### Bookings List (`/dashboard/bookings`)
- Filter by status (pending, confirmed, cancelled, rejected)
- Filter by date range and facility
- Click any row to navigate to the full booking detail page

### Booking Detail (`/dashboard/bookings/[id]`)
- Full booking information: facility, venue, dates, customer details, purpose, notes
- Amenities & pricing breakdown (base + surcharge + tax = total)
- Payment summary with per-payment history
- Status history audit trail
- **Actions panel** (admin/manager only): Edit, Confirm/Reject, Record Payment, Cancel, Download Invoice

### Facilities (`/dashboard/facilities`)
- Create, edit, and delete facilities
- Each facility has multiple venues with their own pricing and amenities
- Assign managers to a facility

### Users (`/dashboard/users`)
- View all registered accounts
- Change user roles (`admin`, `manager`, `user`)
- Delete accounts

---

## 7. Settings Reference

`/dashboard/settings` — **Admin only**

Settings are stored as a single document in MongoDB and applied system-wide at runtime (no server restart required after saving).

### General
| Setting | Description |
|---|---|
| **App URL** | Base URL of the deployed app. Used in emails for dashboard links and password reset links. Example: `https://booking.nsc.gov.sb` |
| **SMTP Debug** | When enabled, Nodemailer logs all SMTP traffic to the server console. Use for diagnosing email delivery issues. **Disable in production.** |

### SMTP
| Setting | Description |
|---|---|
| **Host** | SMTP server hostname. Example: `smtp.resend.com` |
| **Port** | SMTP port. Common values: `465` (SSL), `587` (TLS/STARTTLS) |
| **Secure** | Enable SSL (`true` for port 465). Disable for STARTTLS (port 587). |
| **User** | SMTP authentication username (often an API key for services like Resend) |
| **Pass** | SMTP authentication password / API key |
| **From** | The sender address displayed in all outgoing emails. Example: `NSC Bookings <noreply@nsc.gov.sb>` |

### Email Templates
| Setting | Description |
|---|---|
| **Reset Email Subject** | Subject line for password reset emails. Supports `{{resetUrl}}`, `{{userName}}` variables. |
| **Reset Email HTML** | HTML body for password reset emails. |
| **Booking Confirmation Subject** | Subject line for booking confirmation emails. Supports `{{bookingRef}}`, `{{venueName}}`, `{{userName}}`. |
| **Booking Confirmation HTML** | HTML body. Also supports `{{startTime}}`, `{{endTime}}`, `{{dashboardUrl}}`, `{{totalPrice}}`, `{{currency}}`. |

### Notifications
| Setting | Description |
|---|---|
| **Email Enabled** | Master switch. When off, **no emails are sent** regardless of other flags. |
| **SMS Enabled** | Reserved for future SMS integration. No effect currently. |
| **Notify on Booking Created** | Send email to customer and facility managers when a new booking request is submitted. |
| **Notify on Booking Confirmed** | Send confirmation email to customer when admin/manager confirms a booking. |
| **Notify on Booking Cancelled** | Send cancellation email to customer when a booking is cancelled. |

### Booking Policies
| Setting | Default | Description |
|---|---|---|
| **Cancellation Window (hrs)** | 24 | How many hours before the booking start time cancellations are blocked. Set to `0` to allow cancellations at any time. |
| **Max Duration (hrs)** | 12 | Maximum hours a single booking can span. The system rejects bookings longer than this. |
| **Min Lead Time (hrs)** | 2 | Bookings cannot be made less than this many hours in the future. |
| **Buffer (mins)** | 0 | Gap enforced between consecutive bookings on the same venue. Applied symmetrically on both sides of any new booking. |

### Locale & Currency
| Setting | Default | Description |
|---|---|---|
| **Timezone** | UTC | Stored for reference. Not yet applied to server-side date formatting. |
| **Locale** | en | Used in date formatting in notification emails. |
| **Currency** | SBD | Currency code displayed in booking responses, invoices, and emails. |

### Payments & Pricing
| Setting | Default | Description |
|---|---|---|
| **Default Price/hr** | 0 | Fallback hourly rate used when a venue has no `pricePerHour` configured. |
| **Tax %** | 0 | Percentage applied on top of `basePrice + amenitySurcharge`. Stored as `taxAmount` on each booking. |
| **Payment Provider** | — | Reserved for future payment gateway integration. |
| **Payment API Key** | — | Reserved. |
| **Test Mode** | true | Reserved. |

---

## 8. Email & Notification System

Emails are sent via Nodemailer using SMTP credentials from the Settings. The system defaults to skipping emails gracefully (logging a warning) if SMTP is not configured.

### Email events and triggers

| Event | Trigger | Recipient | Controlled by setting |
|---|---|---|---|
| Booking Created | `POST /api/bookings` | Customer + Facility Managers | `emailEnabled` + `events.bookingCreated` |
| Booking Confirmed | `PATCH /api/bookings/[id]` action=`confirm` | Customer | `emailEnabled` + `events.bookingConfirmed` |
| Booking Cancelled | `PATCH /api/bookings/[id]` action=`cancel` | Customer | `emailEnabled` + `events.bookingCancelled` |
| Password Reset | `POST /api/auth/password-reset/request` | Account owner | `emailEnabled` + SMTP configured |

### Template variable reference

Templates support `{{variableName}}` placeholders. Available variables per template:

**Password Reset:**
- `{{resetUrl}}` — Full reset link
- `{{userName}}` — Account holder's name
- `{{appName}}` — App URL from settings

**Booking Confirmation:**
- `{{bookingRef}}` — Human-friendly reference (e.g. `BK-M3F4X`)
- `{{venueName}}` — Name of the booked venue
- `{{userName}}` — Customer's name
- `{{startTime}}` / `{{endTime}}` — ISO date strings
- `{{dashboardUrl}}` — Direct link to booking detail page
- `{{totalPrice}}` — Total booking cost
- `{{currency}}` — Currency code from settings

---

## 9. User Roles & Access Control

| Role | Dashboard access | Bookings | Facilities | Users | Settings |
|---|---|---|---|---|---|
| `admin` | Full | All bookings across all facilities | Create, edit, delete any | View, edit, delete | Full access |
| `manager` | Partial | Only bookings for their assigned facility | View only their facility | No access | No access |
| `user` | Partial | Only their own bookings | No access | No access | No access |

Managers are assigned to facilities by linking their User `_id` in `facility.managerIds`.

---

## 10. Booking Lifecycle

```
[Public Request]
      │
      ▼
  PENDING  ──── Reject ────► REJECTED
      │
      ├─ Cancel (within window) ──► CANCELLED
      │
      ▼
  CONFIRMED
      │
      ├─ Cancel (within window) ──► CANCELLED
      │
      ▼
  [Record Payment]
      │
      ▼
  paymentStatus: PAID  (when remainingBalance ≤ 0)
```

### Creation rules enforced at `POST /api/bookings`
1. End time must be after start time
2. `minLeadTimeHours` — start must be at least N hours from now
3. `maxDurationHours` — booking cannot span more than N hours
4. No overlap with existing `pending` or `confirmed` bookings (±buffer)
5. Venue must have `isBookable: true`

### Cancellation rules enforced at `PATCH /api/bookings/[id]` (action=`cancel`)
- If `cancellationWindowHours > 0` and booking starts within the window → **rejected with error**

---

## 11. Pricing & Tax Engine

Price is calculated at booking **creation** and **edit** time:

```
hours           = (endTime - startTime) / 3600000
pricePerHour    = venue.pricePerHour || settings.defaultPricing.defaultPricePerHour
basePrice       = hours × pricePerHour
amenitySurcharge= sum of surcharge for each selected amenity
subtotal        = basePrice + amenitySurcharge
taxAmount       = round(subtotal × taxPercent / 100, 2)
totalPrice      = subtotal + taxAmount
```

All four values (`basePrice`, `amenitySurcharge`, `taxAmount`, `totalPrice`) are stored on the booking document for historical accuracy — subsequent changes to settings do **not** retroactively change past bookings.

---

## 12. Availability & Buffer Logic

The `/api/availability` endpoint and the booking creation route both apply the same logic:

```
bufferedStart = requestedStart - bufferMinutes
bufferedEnd   = requestedEnd   + bufferMinutes

conflict exists if any booking (pending or confirmed) has:
  booking.startTime < bufferedEnd  AND  booking.endTime > bufferedStart
```

This ensures there is always a `bufferMinutes` gap between consecutive bookings on the same venue. Set `bufferMinutes = 0` to allow back-to-back bookings.

---

## 13. Invoice & PDF Generation

Invoices are generated on-demand via `@react-pdf/renderer`.

- Function: `generateInvoicePDF(booking)` in `src/lib/invoice.tsx`
- Currency is read from `booking.currency` (passed in at generation time from settings)
- Tax line item appears automatically when `taxAmount > 0`
- Available from the Booking Detail page via the "Download Invoice" button

---

## 14. Deployment & Maintenance

### Production checklist

- [ ] Set `NEXTAUTH_URL` to the production domain
- [ ] Set a strong `NEXTAUTH_SECRET`
- [ ] Set `MONGODB_URI` to a production cluster (with replica set for change streams)
- [ ] Configure SMTP settings via the admin Settings screen
- [ ] Set `App URL` in Settings to match the production URL
- [ ] Disable `SMTP Debug` in Settings
- [ ] Set `Tax %` and `Currency` appropriately
- [ ] Review `Booking Policies` — especially `Cancellation Window` and `Buffer Minutes`

### Build for production

```bash
npm run build
npm start
```

### Database indexes
The following indexes are defined automatically via Mongoose:
- `bookings`: `{ venueId, startTime, endTime }` — fast overlap queries
- `bookings`: `{ bookingRef }` — unique sparse
- `bookings.statusHistory`: `{ changedAt: -1 }`

---

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `CLIENT_FETCH_ERROR: Failed to fetch` on login page | Dev server restarting, or `NEXTAUTH_URL` mismatch | Wait for compilation; check `NEXTAUTH_URL` in `.env` |
| Emails not sending | SMTP not configured or `emailEnabled = false` | Check Settings → SMTP and Notifications |
| Emails sending but landing in spam | `smtp.from` domain not matching SMTP provider | Set the correct sender domain in Settings → SMTP → From |
| Bookings accepted outside hours | `minLeadTimeHours = 0` | Set a non-zero value in Settings → Booking Policies |
| Buffer not being applied | `bufferMinutes = 0` | Set in Settings → Booking Policies |
| Tax not appearing on invoices | `taxPercent = 0` | Set in Settings → Payments & Pricing |
| Password reset emails not received | SMTP not configured or `emailEnabled = false` | Configure SMTP in Settings |
| `Booking not found` on detail page | Booking was deleted or ID is wrong | Check MongoDB directly |
