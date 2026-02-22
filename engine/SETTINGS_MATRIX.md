# Settings Integration Matrix

Quick reference for which settings are used in which API endpoints.

## By Endpoint

### POST `/api/auth/password-reset/request`
| Setting | Used For | Notes |
|---------|----------|-------|
| `smtp.*` | Email sending | Nodemailer transport config |
| `appUrl` | Reset URL generation | Fallback to `NEXT_PUBLIC_APP_URL` |
| `templates.resetEmailSubject` | Email subject | Rendered with placeholders |
| `templates.resetEmailHtml` | Email body | Rendered with placeholders |
| `notifications.emailEnabled` | Master toggle | Skip if false |
| `bookingPolicies.minLeadTimeHours` | ❌ Not used | |

### POST `/api/bookings` (Create Booking)
| Setting | Used For | Notes |
|---------|----------|-------|
| `bookingPolicies.minLeadTimeHours` | Validation | Reject if < X hours advance |
| `bookingPolicies.maxDurationHours` | Validation | Reject if duration > X hours |
| `bookingPolicies.bufferMinutes` | Availability check | Add to start/end times |
| `smtp.*` | Email sending | Nodemailer transport config |
| `appUrl` | Dashboard URL in email | For booking details link |
| `templates.bookingConfirmationSubject` | Email subject | Rendered with placeholders |
| `templates.bookingConfirmationHtml` | Email body | Rendered with placeholders |
| `notifications.emailEnabled` | Master toggle | Skip if false |

### PATCH `/api/bookings/[id]` (Update Booking)
| Setting | Used For | Notes |
|---------|----------|-------|
| `smtp.*` | Email sending (confirm action) | Nodemailer transport config |
| `appUrl` | Dashboard URL in email | For booking details link |
| `templates.bookingConfirmationSubject` | Email subject | Used when status → confirmed |
| `templates.bookingConfirmationHtml` | Email body | Used when status → confirmed |
| `notifications.emailEnabled` | Master toggle | Skip if false |
| All `bookingPolicies.*` | ❌ Not used | (Payment recording doesn't validate) |

### GET `/api/settings`
| Setting | Used For |
|---------|----------|
| All settings | Returned to client |

### PATCH `/api/settings` (Admin Only)
| Setting | Used For | Validation |
|---------|----------|----------|
| All settings | Persisted to database | Type validation at schema level |

## By Setting

### `bookingPolicies`
| Setting | Endpoints Used | Default | Type |
|---------|----------------|---------|------|
| `minLeadTimeHours` | POST `/api/bookings` | 2 | Number |
| `maxDurationHours` | POST `/api/bookings` | 12 | Number |
| `bufferMinutes` | POST `/api/bookings` | 0 | Number |
| `cancellationWindowHours` | ❌ Not implemented | 24 | Number |

### `smtp`
| Setting | Endpoints Used | Required | Type |
|---------|----------------|----------|------|
| `host` | Auth/Bookings email routes | For email sending | String |
| `port` | Auth/Bookings email routes | ✓ (with host) | Number |
| `secure` | Auth/Bookings email routes | For TLS/SSL | Boolean |
| `user` | Auth/Bookings email routes | Optional | String |
| `pass` | Auth/Bookings email routes | Optional | String |
| `from` | Auth/Bookings email routes | Falls back to user | String |

### `templates`
| Setting | Endpoints Used | Default | Type |
|---------|----------------|---------|------|
| `resetEmailSubject` | Password reset request | "Password reset" | String |
| `resetEmailHtml` | Password reset request | Generic template | String |
| `bookingConfirmationSubject` | Booking POST & PATCH confirm | "Booking confirmation" | String |
| `bookingConfirmationHtml` | Booking POST & PATCH confirm | Generic template | String |
| `paymentReceiptSubject` | ❌ Not implemented | "Payment receipt" | String |
| `paymentReceiptHtml` | ❌ Not implemented | Generic template | String |

### `notifications`
| Setting | Endpoints Used | Default | Type |
|---------|----------------|---------|------|
| `emailEnabled` | All email endpoints | true | Boolean |
| `events.bookingCreated` | ❌ Not checked | true | Boolean |
| `events.bookingConfirmed` | ❌ Not checked | true | Boolean |
| `events.bookingCancelled` | ❌ Not implemented | true | Boolean |

### Other Settings
| Setting | Endpoints Used | Default | Status |
|---------|----------------|---------|--------|
| `appUrl` | Password reset, Booking emails | env var or localhost | ✅ Integrated |
| `timezone` | ❌ Not used | UTC | ⏳ Pending |
| `locale` | ❌ Not used | en | ⏳ Pending |
| `currency` | ❌ Not used | SBD | ⏳ Pending |
| `paymentGateway.*` | ❌ Not used | — | ⏳ Pending |
| `defaultPricing.*` | ❌ Not used | — | ⏳ Pending |
| `smtpDebug` | ❌ Not used | false | ⏳ Pending |

## Integration Checklist

### Completed ✅
- [x] Load settings in bookings POST
- [x] Validate minLeadTimeHours
- [x] Validate maxDurationHours
- [x] Apply bufferMinutes to availability check
- [x] Send confirmation email on booking creation
- [x] Send confirmation email on booking confirmation
- [x] Use custom email templates
- [x] Implement placeholder rendering
- [x] Respect emailEnabled toggle
- [x] Use appUrl from settings
- [x] Load SMTP config from settings
- [x] Handle missing SMTP gracefully

### In Progress ⏳
- [ ] Check event-specific toggles
- [ ] Implement payment receipt emails
- [ ] Add cancellation policy enforcement
- [ ] Use timezone/locale for date formatting
- [ ] Wire payment gateway selection
- [ ] Use defaultPricing values

## Notes

### Placeholder Variables Available
Reference these in email templates:

#### Password Reset Email
- `{{resetUrl}}` - Full reset URL with token
- `{{userName}}` - User name
- `{{appName}}` - App name from appUrl

#### Booking Confirmation Email
- `{{bookingRef}}` - Booking reference
- `{{venueName}}` - Venue name
- `{{userName}}` - Booking contact name
- `{{startTime}}` - Booking start (ISO format)
- `{{endTime}}` - Booking end (ISO format)  
- `{{dashboardUrl}}` - Link to booking details
- `{{totalPrice}}` - Total booking price

