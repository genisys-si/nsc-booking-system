# NSC Booking System — Facility Manager User Guide

> **National Sports Council — Facility Booking Platform**
> Audience: Facility Managers
> Last updated: April 2026

---

## Welcome

This guide covers everything you need to know as a **Facility Manager** to review, manage, and process bookings for your assigned facility via the NSC Dashboard.

As a manager, you can:
- View all bookings for your facility
- Confirm or reject booking requests
- Edit booking details
- Record and track payments
- Cancel bookings when needed

You **cannot** access other facilities' bookings, manage users, or change system settings — those are admin-only functions.

---

## Table of Contents

1. [Signing In](#1-signing-in)
2. [Your Dashboard](#2-your-dashboard)
3. [Viewing Bookings](#3-viewing-bookings)
4. [Booking Detail Page](#4-booking-detail-page)
5. [Confirming a Booking](#5-confirming-a-booking)
6. [Rejecting a Booking](#6-rejecting-a-booking)
7. [Editing a Booking](#7-editing-a-booking)
8. [Recording a Payment](#8-recording-a-payment)
9. [Cancelling a Booking](#9-cancelling-a-booking)
10. [Understanding Booking Status](#10-understanding-booking-status)
11. [Understanding Payment Status](#11-understanding-payment-status)
12. [Pricing Explained](#12-pricing-explained)
13. [Email Notifications](#13-email-notifications)
14. [Frequently Asked Questions](#14-frequently-asked-questions)

---

## 1. Signing In

1. Open your browser and go to the NSC Booking System URL (provided by your administrator).
2. Click **Sign In** and enter your email address and password.
3. You will be taken to your dashboard automatically.

> If you have forgotten your password, click **Forgot password?** on the sign-in page and follow the instructions sent to your email.

---

## 2. Your Dashboard

After signing in, you will see the **NSC Dashboard** sidebar on the left with two sections available to you:

| Section | What it shows |
|---|---|
| **My Facilities** | The facility (or facilities) assigned to you |
| **Bookings** | All bookings for your facility only |
| **Profile** | Your account name and password settings |

> **Note:** The **Users** and **Settings** sections are only visible to administrators and will not appear in your sidebar.

---

## 3. Viewing Bookings

### Bookings List

Click **Bookings** in the sidebar. You will see a table showing all bookings for your facility, with columns for:

- **Booking Ref** — a short human-friendly code (e.g. `BK-M4F2X`)
- **Customer** — contact name and email
- **Venue** — which venue within your facility was booked
- **Date/Time** — booking start and end
- **Status** — current booking status (Pending, Confirmed, etc.)
- **Payment** — payment status (Pending, Paid, etc.)

### Filtering bookings

Use the filter bar at the top of the list to narrow results:

- **Status filter** — show only Pending, Confirmed, Cancelled, or Rejected bookings
- **Date range** — show bookings within a specific date window
- **Search** — search by customer name or booking reference

> **Tip:** Start your day by filtering for **Pending** bookings so you can review and act on new requests first.

---

## 4. Booking Detail Page

Click on any row in the bookings list to open the full **Booking Detail** page. This page is your main working area and shows:

### Booking Information card (left)
- **Facility & Venue** — which venue was booked
- **Start & End Time** — exact booking window
- **Date created & last updated**
- **Customer Details** — name, email, number of attendees
- **Amenities & Charges** — selected add-ons with their surcharges, and the full pricing breakdown
- **Purpose & Notes** — what the customer stated

### Actions panel (right)
- **Payment Summary** card — total amount, payment status, amount paid, remaining balance
- **Current Status** card — badge showing the booking's current state
- **Action buttons** — Edit, Confirm/Reject, Record Payment, Cancel

### Payment History card (bottom)
- Chronological list of all payment transactions recorded against this booking

### Status History card (bottom)
- Full audit trail of every status change, who changed it, when, and any reason provided

---

## 5. Confirming a Booking

When a customer submits a booking request, it arrives with a **PENDING** status. You must review and confirm it before the customer can proceed.

**Steps:**
1. Open the booking detail page.
2. In the Actions panel, click the green **Confirm** button.
3. The booking status changes to **CONFIRMED**.
4. The customer automatically receives a confirmation email (if email notifications are enabled by your administrator).

> **When should I confirm?**
> After you have verified the venue is available, the purpose is appropriate, and any required agreements or deposits are in order.

---

## 6. Rejecting a Booking

If you cannot accommodate a booking request, you can reject it.

**Steps:**
1. Open the booking detail page.
2. In the Actions panel, click the red **Reject** button.
3. The booking status changes to **REJECTED**.

> **Note:** You can only reject bookings that are currently **PENDING**. Once a booking is confirmed, use Cancel instead.

---

## 7. Editing a Booking

Administrators and managers can edit booking details directly — useful when a customer calls to change their time, amenities, or contact information.

**Steps:**
1. Open the booking detail page.
2. Click the **Edit Booking** button (pencil icon) in the Actions panel.
3. A dialog will open with the current details pre-filled.
4. Change any of the following:
   - **Start date & time**
   - **End date & time**
   - **Selected amenities** (add or remove)
   - **Contact name**
   - **Contact email**
   - **Number of attendees**
   - **Purpose**
   - **Internal notes**
5. Click **Save Changes**.

### What happens when I edit?

- The system checks the new time slot for conflicts with other bookings (including any configured buffer time between bookings).
- **Pricing is automatically recalculated** based on the new duration, selected amenities, and any applicable tax — the booking's total is updated immediately.
- The change is recorded in the **Status History** for audit purposes.

> **Tip:** If there is a conflict with another booking, you will see an error message and no changes will be saved. Choose a different time slot.

---

## 8. Recording a Payment

You can record cash, bank transfer, or other offline payments against a confirmed booking.

### Record a partial or full payment

1. Open the booking detail page.
2. In the Actions panel, find the **Payment** section.
3. Click **Record Payment**.
4. Enter:
   - **Amount** — how much was received
   - **Method** — cash, bank transfer, online, etc.
   - **Notes** (optional) — e.g. "Received at front desk"
5. Click **Submit**.

The payment is added to the **Payment History** and the **Remaining Balance** is updated automatically. If the full amount is received, the payment status changes to **PAID**.

### Mark as Fully Paid (quick option)

If you want to mark the full outstanding balance as received in one step:

1. Click **Mark as Paid**.
2. Enter the payment method.
3. Confirm.

> **Important:** Once a payment is recorded, it **cannot be deleted** via the dashboard. Contact your system administrator if a payment was recorded in error.

---

## 9. Cancelling a Booking

You can cancel a confirmed or pending booking.

**Steps:**
1. Open the booking detail page.
2. In the Actions panel, click **Cancel Booking**.
3. Optionally enter a **reason** for the cancellation.
4. Confirm the action.

### Cancellation window policy

Your administrator may have set a **cancellation window** (e.g. 24 hours). If a booking is within this window of its start time, **the system will block the cancellation** and show an error message.

Example: If the cancellation window is 24 hours and a booking starts in 10 hours, you will not be able to cancel it through the dashboard. Contact your system administrator to override this if necessary.

When a booking is cancelled, the customer receives an automatic cancellation email (if configured).

---

## 10. Understanding Booking Status

| Status | Meaning | What to do |
|---|---|---|
| 🟡 **PENDING** | Customer has submitted a request; awaiting your review | Review and either Confirm or Reject |
| 🟢 **CONFIRMED** | You have approved the booking | Record payment when received |
| 🔴 **REJECTED** | You declined the request | No further action needed |
| ⚫ **CANCELLED** | The booking was cancelled (by you or admin) | No further action needed |

---

## 11. Understanding Payment Status

| Status | Meaning |
|---|---|
| 🟡 **PENDING** | No payment has been recorded yet |
| 🟢 **PAID** | The full booking amount has been paid |
| 🔴 **FAILED** | Payment attempt failed (future gateway use) |
| 🔵 **REFUNDED** | A refund was processed (future gateway use) |

The payment status is tracked separately from the booking status. A booking can be **CONFIRMED** but still have a **PENDING** payment — this is normal for bookings where payment is collected later.

---

## 12. Pricing Explained

When a customer books a venue, the total is calculated as follows:

```
Duration         = End Time − Start Time (in hours)
Base Price       = Duration × Venue Hourly Rate
Amenity Surcharge= Sum of surcharges for selected amenities
Tax              = (Base Price + Amenity Surcharge) × Tax Rate
─────────────────────────────────────────────────────
Total Price      = Base Price + Amenity Surcharge + Tax
```

**Example:**

| Item | Calculation | Amount |
|---|---|---|
| 3 hours × SBD 200/hr | | SBD 600.00 |
| Sound System surcharge | | SBD 50.00 |
| Tax (5%) | SBD 650 × 5% | SBD 32.50 |
| **Total** | | **SBD 682.50** |

> The pricing is locked in at the time the booking is **created or last edited** — changes to venue rates or tax settings will not affect existing bookings.

---

## 13. Email Notifications

The following emails are sent automatically by the system (when email is configured):

| When | Who receives it |
|---|---|
| Customer submits a new booking | Customer + You (as facility manager) |
| You confirm a booking | Customer only |
| You or admin cancels a booking | Customer only |

> If you are not receiving notification emails, contact your system administrator to check the SMTP and notification settings.

---

## 14. Frequently Asked Questions

**Q: Can I see bookings from other facilities?**
No. Your dashboard only shows bookings for the facility (or facilities) assigned to you by an administrator.

**Q: Can I create a booking on behalf of a customer?**
Not directly from the dashboard. The public booking form at the main website is the intended entry point. Contact your system administrator if you need a booking created manually.

**Q: What happens if two customers book the same venue at the same time?**
The system prevents this automatically. The second booking request will be rejected with a conflict error. Buffer time between bookings (if configured by your administrator) is also enforced.

**Q: Can I edit a booking after it's been confirmed?**
Yes. Admins and managers can edit bookings in any status. Pricing will be recalculated automatically.

**Q: Can I undo a confirmation?**
You can cancel a confirmed booking, but you cannot move it back to Pending. If a booking was confirmed by mistake, cancel it and ask the customer to resubmit.

**Q: Can I undo a recorded payment?**
Not through the dashboard. Contact your system administrator to correct payment records directly in the database.

**Q: A customer wants to cancel but the system won't let me. Why?**
Your administrator has set a cancellation window (e.g. 24 hours). If the booking starts within that window, the system blocks cancellations automatically. Contact your administrator to override this if necessary.

**Q: The customer didn't receive their confirmation email. What do I do?**
Ask the customer to check their spam/junk folder. If it's not there, contact your system administrator to verify the SMTP and notification settings are correctly configured.

**Q: How do I reset my password?**
On the sign-in page, click **Forgot password?** and enter your email address. A reset link will be sent to you.
