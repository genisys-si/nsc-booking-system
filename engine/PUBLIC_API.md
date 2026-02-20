# NSC Booking System — Public API Documentation

## Overview

This API allows external applications and websites to:
- **List facilities** (venues, amenities, pricing)
- **Retrieve venue details** (including amenities and pricing)
- **Create bookings** (unauthenticated guests or authenticated users)
- **Manage bookings** (admin/manager/user roles via JWT)

All API responses include proper CORS headers, allowing cross-origin requests from browsers.

---

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://<your-domain>`

---

## Authentication

The API supports two authentication methods:

### 1. Session-based (Browser/Next.js App)
Used for your internal dashboard. Requires cookies and `next-auth` session.
```javascript
// Include credentials to send session cookies
const res = await fetch('/api/bookings', { 
  credentials: 'include' 
});
```

### 2. JWT Bearer Token (Public/3rd-party)
Recommended for external websites and mobile apps.
```bash
curl -H "Authorization: Bearer <JWT>" http://localhost:3000/api/bookings
```

#### Generate JWT Secret
1. Open PowerShell in your project directory
2. Run:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Copy the output and add to `.env`:
   ```dotenv
   JWT_SECRET=<paste-output-here>
   ```

#### Create a JWT Token
Use any JWT library (e.g., `jsonwebtoken` in Node.js, `PyJWT` in Python, online tools). 

**Payload structure** (HS256):
```json
{
  "sub": "user_id_here",
  "id": "user_id_here",
  "role": "user",
  "email": "user@example.com",
  "exp": 1950768000
}
```

**Fields:**
- `sub` or `id`: MongoDB user ID (required)
- `role`: One of `admin`, `manager`, `user` (required)
- `email`: User email (optional)
- `exp`: Unix timestamp (seconds) when token expires (optional, default no expiry)

**Example: Generate token in Node.js**
```javascript
const crypto = require('crypto');
const secret = process.env.JWT_SECRET;

function createJwt(userId, role, email) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: userId,
    id: userId,
    role: role,
    email: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
  };

  function base64urlEncode(str) {
    return Buffer.from(str, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  const headerEncoded = base64urlEncode(JSON.stringify(header));
  const payloadEncoded = base64urlEncode(JSON.stringify(payload));
  const signed = `${headerEncoded}.${payloadEncoded}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signed)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signed}.${signature}`;
}

const token = createJwt('64a1f2..._user_id', 'user', 'jane@example.com');
console.log(token);
```

---

## Endpoints

### 🟢 GET `/api/facilities`

**Description:** List all facilities with their venues and amenities.

**Authentication:** None (public)

**Query Parameters:** None

**Success Response:** `200 OK`
```json
[
  {
    "_id": "64a1f2c3d4e5f6g7h8i9j0k1",
    "name": "Main Conference Center",
    "location": "Downtown",
    "description": "Modern facility with multiple venues",
    "status": "active",
    "coordinates": {
      "lat": -9.4438,
      "lng": 160.3518
    },
    "coverImage": "/uploads/facilities/abc123.jpg",
    "galleryImages": ["/uploads/facilities/xyz789.jpg"],
    "venues": [
      {
        "_id": "64b2g3d4e5f6g7h8i9j0k2l",
        "name": "Grand Ballroom",
        "capacity": 500,
        "pricePerHour": 100,
        "isBookable": true,
        "amenities": [
          {
            "_id": "64c3h4d5e6f7g8h9i0j1k2l",
            "name": "Projector",
            "surcharge": 10
          },
          {
            "_id": "64d4i5d6e7f8g9h0i1j2k3l",
            "name": "Catering Setup",
            "surcharge": 50
          }
        ],
        "images": ["/uploads/venues/room1.jpg"]
      }
    ],
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-02-10T14:30:00.000Z"
  }
]
```

**Error Response:** `500`
```json
{ "error": "Server error" }
```

**Example Requests:**
```bash
# cURL
curl -sS http://localhost:3000/api/facilities

# JavaScript fetch
const facilities = await fetch('/api/facilities').then(r => r.json());
console.log(facilities);

# Python
import requests
response = requests.get('http://localhost:3000/api/facilities')
facilities = response.json()
```

---

### 🟢 GET `/api/venues/:venueId`

**Description:** Get details for a single venue (includes facility name and all amenities).

**Authentication:** None (public)

**URL Parameters:**
- `venueId` (string, required): MongoDB venue ID

**Success Response:** `200 OK`
```json
{
  "facilityName": "Main Conference Center",
  "venue": {
    "_id": "64b2g3d4e5f6g7h8i9j0k2l",
    "name": "Grand Ballroom",
    "capacity": 500,
    "pricePerHour": 100,
    "isBookable": true,
    "amenities": [
      {
        "_id": "64c3h4d5e6f7g8h9i0j1k2l",
        "name": "Projector",
        "surcharge": 10
      },
      {
        "_id": "64d4i5d6e7f8g9h0i1j2k3l",
        "name": "Catering Setup",
        "surcharge": 50
      }
    ],
    "images": ["/uploads/venues/room1.jpg", "/uploads/venues/room2.jpg"]
  }
}
```

**Error Responses:**
- `404`: Venue not found
- `500`: Server error

**Example Requests:**
```bash
# cURL
curl -sS http://localhost:3000/api/venues/64b2g3d4e5f6g7h8i9j0k2l

# JavaScript
const { facilityName, venue } = await fetch('/api/venues/VENUE_ID').then(r => r.json());
console.log(`${facilityName} - ${venue.name}`);
```

---

### 🔵 POST `/api/bookings`

**Description:** Create a new booking request. Can be submitted by unauthenticated guests or authenticated users.

**Authentication:** Optional (Bearer JWT or session)

**Request Body (JSON):**
```json
{
  "facilityId": "64a1f2c3d4e5f6g7h8i9j0k1",
  "venueId": "64b2g3d4e5f6g7h8i9j0k2l",
  "startTime": "2026-03-15T09:00:00.000Z",
  "endTime": "2026-03-15T12:00:00.000Z",
  "contactName": "Jane Doe",
  "contactEmail": "jane@example.com",
  "purpose": "Corporate meeting",
  "attendees": 50,
  "notes": "Please set up a room with round tables",
  "amenities": ["64c3h4d5e6f7g8h9i0j1k2l", "64d4i5d6e7f8g9h0i1j2k3l"]
}
```

**Required Fields:**
- `facilityId` (string)
- `venueId` (string)
- `startTime` (ISO 8601 datetime)
- `endTime` (ISO 8601 datetime)
- `contactName` (string)
- `contactEmail` (string)

**Optional Fields:**
- `purpose` (string)
- `attendees` (number)
- `notes` (string)
- `amenities` (array of amenity IDs)

**Success Response:** `201 Created`
```json
{
  "success": true,
  "bookingId": "64e5j6d7e8f9g0h1i2j3k4l",
  "message": "Booking request submitted (pending approval)",
  "pricing": {
    "hours": "3.00",
    "basePrice": "300.00",
    "amenitySurcharge": "60.00",
    "totalPrice": "360.00",
    "currency": "SBD"
  }
}
```

**Error Responses:**
- `400`: Missing required fields or invalid times
- `404`: Facility or venue not found
- `409`: Time slot overlaps with existing booking
- `500`: Server error

**Example Requests:**
```bash
# cURL with session cookie
curl -X POST http://localhost:3000/api/bookings \
  -H 'Content-Type: application/json' \
  -b 'sessionCookie=...' \
  -d '{
    "facilityId": "64a1f2...",
    "venueId": "64b2g3...",
    "startTime": "2026-03-15T09:00:00.000Z",
    "endTime": "2026-03-15T12:00:00.000Z",
    "contactName": "Jane Doe",
    "contactEmail": "jane@example.com",
    "purpose": "Meeting",
    "amenities": ["64c3h4..."]
  }'

# cURL with JWT token
curl -X POST http://localhost:3000/api/bookings \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGc...' \
  -d '{...}'

# JavaScript with JWT
const token = 'eyJhbGc...';
const res = await fetch('/api/bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    facilityId: '64a1f2...',
    venueId: '64b2g3...',
    startTime: '2026-03-15T09:00:00.000Z',
    endTime: '2026-03-15T12:00:00.000Z',
    contactName: 'Jane Doe',
    contactEmail: 'jane@example.com',
    purpose: 'Meeting'
  })
});
const data = await res.json();
console.log(data.bookingId);
```

---

### 🔵 GET `/api/bookings`

**Description:** List bookings. Requires authentication. Response varies by user role:
- **Admin:** All bookings
- **Manager:** Only bookings for facilities they manage
- **User:** Only their own bookings

**Authentication:** Required (Bearer JWT or session)

**Query Parameters:** None

**Success Response:** `200 OK`
```json
[
  {
    "_id": "64e5j6d7e8f9g0h1i2j3k4l",
    "userId": {
      "_id": "64f6k7d8e9f0g1h2i3j4k5l",
      "name": "Jane Doe",
      "email": "jane@example.com"
    },
    "facilityId": {
      "_id": "64a1f2c3d4e5f6g7h8i9j0k1",
      "name": "Main Conference Center"
    },
    "venueId": {
      "_id": "64b2g3d4e5f6g7h8i9j0k2l",
      "name": "Grand Ballroom",
      "pricePerHour": 100,
      "amenities": [...]
    },
    "startTime": "2026-03-15T09:00:00.000Z",
    "endTime": "2026-03-15T12:00:00.000Z",
    "purpose": "Corporate meeting",
    "attendees": 50,
    "contactName": "Jane Doe",
    "contactEmail": "jane@example.com",
    "notes": "Please set up round tables",
    "status": "pending",
    "amenities": ["64c3h4d5e6f7g8h9i0j1k2l"],
    "basePrice": 300,
    "amenitySurcharge": 60,
    "totalPrice": 360,
    "invoiceId": "INV-ABC123XYZ",
    "paymentStatus": "pending",
    "createdAt": "2026-02-20T10:30:00.000Z",
    "updatedAt": "2026-02-20T10:30:00.000Z"
  }
]
```

**Error Responses:**
- `401`: Unauthorized (no valid session or JWT token)
- `500`: Server error

**Example Requests:**
```bash
# cURL with JWT
curl -H "Authorization: Bearer eyJhbGc..." http://localhost:3000/api/bookings

# JavaScript with JWT
const token = 'eyJhbGc...';
const bookings = await fetch('/api/bookings', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

---

## CORS & Headers

All responses include:
```
Access-Control-Allow-Origin: <echoed-origin-or-*>
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept
Vary: Origin
```

Preflight (OPTIONS) requests receive `204 No Content`.

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request (missing fields, invalid times, validation errors) |
| 401 | Unauthorized (authentication required but missing/invalid) |
| 403 | Forbidden (authenticated but not authorized for resource) |
| 404 | Not Found (facility, venue, or booking doesn't exist) |
| 409 | Conflict (time slot overlap) |
| 500 | Server Error |

---

## Rate Limiting

Currently no rate limiting. In production, add rate limiting middleware.

---

## Changelog

**v1.0 (2026-02-20)**
- Initial release
- Public GET endpoints for facilities and venues
- Public/authenticated POST for bookings
- JWT Bearer token support
- CORS global middleware
- Session-based auth fallback

---

## Support & Questions

For issues or questions about the API, contact the development team.
