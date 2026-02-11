# National Sports Council Booking System – Solomon Islands

A modern web application for booking sports facilities and venues managed by the **National Sports Council (NSC)** in Solomon Islands.

The system allows:
- Public users to browse bookable venues and submit booking requests
- Facility managers to view, approve, reject or cancel bookings for their assigned facilities
- Administrators to manage facilities, venues and user roles

Built with **Next.js (App Router)**, **TypeScript**, **shadcn/ui**, **Tailwind CSS**, **MongoDB** (Atlas), **NextAuth.js** (Credentials provider), **Sonner** toasts, and **react-hook-form + zod**.

## Features (current state)

- Authentication (email/password with role-based access: admin / manager / user)
- Password hashing with bcryptjs
- Home page: public landing for guests + dashboard overview for logged-in users
- Booking availability check (prevents overlapping bookings)
- Manager-scoped bookings view
- Protected dashboard routes
- Sonner toast notifications app-wide
- MongoDB models: User, Facility, Booking

Planned / upcoming:
- Multi-step booking wizard
- Venue management for managers
- Full admin panel (create/edit facilities & assign managers)
- Signup page (admin-controlled or public)
- Better date/time picker with conflict highlighting

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Authentication**: NextAuth.js v4 (Credentials + JWT strategy)
- **Backend/Database**: MongoDB (Atlas), Mongoose
- **Forms & Validation**: react-hook-form + zod
- **Notifications**: Sonner
- **Icons**: lucide-react

## Prerequisites

- Node.js ≥ 20.x (recommended: 20.18+ or latest LTS)
- MongoDB Atlas account (free tier is sufficient)
- Git

## Installation & Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/nsc-booking-system.git
cd nsc-booking-system
```
### 2. Install Dependencies 
```bash
npm install
# or with pnpm (recommended for speed & disk space)
# pnpm install
```
### 3. Setup Enviroment Variables
```bash
# MongoDB Atlas connection string

MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abc123.mongodb.net/nsc-booking?retryWrites=true&w=majority

# NextAuth secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-very-long-random-secret-here

# Base URL (change to production domain later)
NEXTAUTH_URL=http://localhost:3000

```
### 4. Seed initial users (admin & manager)
This creates test accounts so you can log in immediately.

```bash
# Make sure you have tsx installed
npm install --save-dev tsx

# Run the seed script
npx tsx src/scripts/seed-users.ts

```
### 5. Run the development server
```bash
npm run dev
# or
npm run dev -- --turbo   # if using Turbopack

```
## Project Structure
```bash
src/
├── app/
│   ├── api/                  # API routes (bookings, facilities, auth)
│   ├── auth/
│   │   └── signin/           # Login page
│   ├── dashboard/            # Manager/admin pages
│   └── page.tsx              # Home (public landing + authenticated dashboard)
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── dashboard/            # Table, cards, etc.
├── lib/
│   ├── db.ts                 # Mongoose connection
│   └── mongodb-client.ts     # MongoDB driver client for NextAuth adapter
├── models/                   # Mongoose schemas (User, Facility, Booking)
├── scripts/
│   └── seed-users.ts         # Initial user seeding
└── types/
    └── next-auth.d.ts        # Type augmentations for NextAuth

```
