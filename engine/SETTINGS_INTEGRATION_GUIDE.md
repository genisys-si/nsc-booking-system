# Settings Integration Guide

This guide explains how to consume Settings in your code and how to add new settings.

## Quick Start: Using Settings in Your Code

### In API Routes

```typescript
import Settings from '@/models/Settings';

export async function POST(req: NextRequest) {
  const settings = await Settings.findOne().lean();
  
  // Access settings
  if (settings?.notifications?.emailEnabled) {
    // send email
  }
  
  if (settings?.bookingPolicies?.minLeadTimeHours) {
    // enforce minimum lead time
  }
}
```

### Template Placeholder Rendering

Settings templates use Handlebars-like syntax: `{{placeholder}}`. Use the helper function:

```typescript
const renderTemplate = (tpl: string, vars: Record<string, string>) => {
  if (!tpl) return '';
  return tpl.replace(/{{\s*([a-zA-Z0-9_\.]+)\s*}}/g, (_, key) => {
    return (vars[key] ?? '') as string;
  });
};

const html = renderTemplate(settings.templates.resetEmailHtml, {
  resetUrl: 'https://app.example.com/reset/abc123',
  userName: 'John Doe',
  appName: 'Booking System',
});
```

### Sending Emails with Settings

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: settings.smtp.host,
  port: settings.smtp.port,
  secure: !!settings.smtp.secure,
  auth: settings.smtp.user ? { user: settings.smtp.user, pass: settings.smtp.pass } : undefined,
});

await transporter.sendMail({
  from: settings.smtp.from || settings.smtp.user,
  to: recipientEmail,
  subject,
  html,
});
```

## Adding New Settings

### 1. Add to Settings Model

Edit `src/models/Settings.ts`:

```typescript
const settingsSchema = new Schema({
  // ... existing fields ...
  
  newFeature: {
    enabled: { type: Boolean, default: true },
    option1: String,
    option2: Number,
  },
});
```

### 2. Update Settings Form (Optional)

Edit `src/components/dashboard/SettingsForm.tsx`:

```tsx
// Add to sections array
{
  id: 'newFeature',
  label: 'New Feature',
  icon: '⚙️',
},

// Add to renderContent switch
case 'newFeature':
  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.newFeature?.enabled ?? true}
            onChange={(e) => setFormData({
              ...formData,
              newFeature: {
                ...formData.newFeature,
                enabled: e.target.checked,
              },
            })}
          />
          Enable New Feature
        </label>
      </div>
      {/* more fields */}
    </div>
  );
```

### 3. Use in Code

```typescript
import Settings from '@/models/Settings';

const settings = await Settings.findOne().lean();

if (settings?.newFeature?.enabled) {
  // Use new feature
}
```

## Common Patterns

### Pattern: Optional Feature Gate

```typescript
if (settings?.featureName?.enabled !== false) {
  // Feature is on by default if not configured
}
```

### Pattern: Fallback Values

```typescript
const appUrl = settings?.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const currency = settings?.currency || 'USD';
```

### Pattern: Notification Checks

```typescript
// 1. Master toggle
if (!settings?.notifications?.emailEnabled) {
  return; // skip
}

// 2. Event-specific toggle
if (!settings?.notifications?.events?.bookingConfirmed) {
  return; // skip
}

// Send email
```

### Pattern: Policy Enforcement

```typescript
// Load policy
const minLeadHours = settings?.bookingPolicies?.minLeadTimeHours ?? 2;

// Validate
const minDate = new Date(Date.now() + minLeadHours * 60 * 60 * 1000);
if (requestedDate < minDate) {
  return NextResponse.json({ error: 'Too soon' }, { status: 400 });
}
```

## Caching Considerations

Settings are loaded with `.lean()` for performance. If you make frequent queries:

1. **Within a single request:** Use the same loaded settings object
2. **Across requests:** Consider adding caching layer (Redis, in-memory with TTL)
3. **Settings changes:** Currently require page refresh to see updated values; consider WebSocket invalidation for real-time updates

## Testing Settings

### Manual Testing
1. Access `/dashboard/settings` as admin
2. Modify a setting
3. Save
4. Clear browser cache
5. Trigger the feature that uses the setting
6. Verify behavior changed

### Automated Testing
```typescript
// Mock Settings for tests
jest.mock('@/models/Settings', () => ({
  default: {
    findOne: () => ({
      lean: () => ({
        notifications: { emailEnabled: false },
      }),
    }),
  },
}));
```

## Future Enhancements

- [ ] Settings validation schemas (validate port numbers, URLs, currency codes)
- [ ] Settings history/audit log (track who changed what and when)
- [ ] Settings presets (e.g., "development", "production" presets)
- [ ] Settings caching with TTL (Redis-backed)
- [ ] Real-time settings updates (WebSocket invalidation)
- [ ] Settings export/import (JSON backup/restore)
- [ ] Settings secrets management (encrypted storage for API keys)

