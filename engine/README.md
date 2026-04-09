# NSC Facility Booking System

A web-based facility booking and management platform for the **National Sports Council of Solomon Islands**. Enables the public to submit booking requests online and allows administrators and facility managers to review, approve, track, and collect payments via a secure dashboard.

## Documentation

| Guide | Audience | Description |
|---|---|---|
| [System Administrator Guide](./docs/SYSTEM_ADMIN_GUIDE.md) | System Admins | Architecture, environment setup, API reference, data models, settings reference, deployment |
| [Facility Manager Guide](./docs/FACILITY_MANAGER_GUIDE.md) | Facility Managers | Daily workflows: reviewing bookings, confirming, editing, recording payments, cancellations |

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Environment Variables

Create a `.env` file in the `engine/` directory:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<dbname>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-32-char-string>
NEXT_PUBLIC_APP_URL=http://localhost:3000
EMAIL_FROM=noreply@nsc.gov.sb
```

### Run Development Server

```bash
cd engine
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **UI:** shadcn/ui + Tailwind CSS
- **Database:** MongoDB + Mongoose
- **Auth:** NextAuth.js (JWT + Credentials)
- **Email:** Nodemailer (SMTP configured from admin settings)
- **PDF:** @react-pdf/renderer

## Key Features

- ✅ Public booking form (no login required)
- ✅ Role-based dashboard (Admin / Manager / User)
- ✅ Booking lifecycle: Pending → Confirmed / Rejected / Cancelled
- ✅ Partial & full payment tracking with history
- ✅ Configurable booking policies (lead time, max duration, buffer minutes, cancellation window)
- ✅ Tax calculation and dynamic pricing
- ✅ SMTP email notifications (booking created, confirmed, cancelled, password reset)
- ✅ Customisable email templates with variable substitution
- ✅ PDF invoice generation
- ✅ Per-facility manager assignments
