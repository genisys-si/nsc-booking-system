"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type SectionKey =
  | "general"
  | "smtp"
  | "templates"
  | "notifications"
  | "policies"
  | "locale"
  | "payments";

export default function SettingsForm({ initial }: { initial?: any }) {
  // SMTP
  const smtp = initial?.smtp || {};
  const [host, setHost] = useState(smtp.host || "");
  const [port, setPort] = useState(smtp.port || "");
  const [user, setUser] = useState(smtp.user || "");
  const [pass, setPass] = useState(smtp.pass || "");
  const [from, setFrom] = useState(smtp.from || "");
  const [smtpDebug, setSmtpDebug] = useState(initial?.smtpDebug ?? false);

  // General
  const [appUrl, setAppUrl] = useState(initial?.appUrl || "");

  // Templates
  const [resetSubject, setResetSubject] = useState(initial?.templates?.resetEmailSubject || "Password reset");
  const [resetHtml, setResetHtml] = useState(initial?.templates?.resetEmailHtml || "<p>Reset: {{resetUrl}}</p>");
  const [bookingSubj, setBookingSubj] = useState(initial?.templates?.bookingConfirmationSubject || "Booking confirmation");
  const [bookingHtml, setBookingHtml] = useState(initial?.templates?.bookingConfirmationHtml || "<p>Your booking is confirmed</p>");

  // Notifications
  const [emailEnabled, setEmailEnabled] = useState(initial?.notifications?.emailEnabled ?? true);
  const [smsEnabled, setSmsEnabled] = useState(initial?.notifications?.smsEnabled ?? false);
  const [notifyCreated, setNotifyCreated] = useState(initial?.notifications?.events?.bookingCreated ?? true);
  const [notifyConfirmed, setNotifyConfirmed] = useState(initial?.notifications?.events?.bookingConfirmed ?? true);
  const [notifyCancelled, setNotifyCancelled] = useState(initial?.notifications?.events?.bookingCancelled ?? true);

  // Policies
  const [cancellationWindowHours, setCancellationWindowHours] = useState(initial?.bookingPolicies?.cancellationWindowHours ?? 24);
  const [maxDurationHours, setMaxDurationHours] = useState(initial?.bookingPolicies?.maxDurationHours ?? 12);
  const [minLeadTimeHours, setMinLeadTimeHours] = useState(initial?.bookingPolicies?.minLeadTimeHours ?? 2);
  const [bufferMinutes, setBufferMinutes] = useState(initial?.bookingPolicies?.bufferMinutes ?? 0);

  // Locale / currency
  const [timezone, setTimezone] = useState(initial?.timezone || "UTC");
  const [locale, setLocale] = useState(initial?.locale || "en");
  const [currency, setCurrency] = useState(initial?.currency || "SBD");

  // Payments / pricing
  const [pgProvider, setPgProvider] = useState(initial?.paymentGateway?.provider || "");
  const [pgApiKey, setPgApiKey] = useState(initial?.paymentGateway?.apiKey || "");
  const [pgTestMode, setPgTestMode] = useState(initial?.paymentGateway?.testMode ?? true);
  const [defaultPricePerHour, setDefaultPricePerHour] = useState(initial?.defaultPricing?.defaultPricePerHour ?? 0);
  const [taxPercent, setTaxPercent] = useState(initial?.defaultPricing?.taxPercent ?? 0);

  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<SectionKey>("general");

  async function save() {
    setSaving(true);
    try {
      const payload: any = {
        smtp: { host, port: Number(port) || undefined, user, pass, from },
        appUrl,
        templates: {
          resetEmailSubject: resetSubject,
          resetEmailHtml: resetHtml,
          bookingConfirmationSubject: bookingSubj,
          bookingConfirmationHtml: bookingHtml,
        },
        notifications: {
          emailEnabled,
          smsEnabled,
          events: { bookingCreated: notifyCreated, bookingConfirmed: notifyConfirmed, bookingCancelled: notifyCancelled },
        },
        bookingPolicies: { cancellationWindowHours, maxDurationHours, minLeadTimeHours, bufferMinutes },
        timezone,
        locale,
        currency,
        paymentGateway: { provider: pgProvider, apiKey: pgApiKey, testMode: pgTestMode },
        defaultPricing: { defaultPricePerHour, taxPercent },
        smtpDebug,
      };

      const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const navItems: { key: SectionKey; label: string }[] = [
    { key: "general", label: "General" },
    { key: "smtp", label: "SMTP" },
    { key: "templates", label: "Email Templates" },
    { key: "notifications", label: "Notifications" },
    { key: "policies", label: "Booking Policies" },
    { key: "locale", label: "Locale & Currency" },
    { key: "payments", label: "Payments & Pricing" },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Left nav */}
        <aside className="lg:col-span-1 bg-card border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Settings</h3>
          <nav className="space-y-2">
            {navItems.map((it) => (
              <button
                key={it.key}
                onClick={() => setSection(it.key)}
                className={`w-full text-left py-2 px-3 rounded ${section === it.key ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}
              >
                {it.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <main className="lg:col-span-5 space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{navItems.find(n=>n.key===section)?.label}</h2>
                <p className="text-sm text-muted-foreground mt-1">Configure {navItems.find(n=>n.key===section)?.label.toLowerCase()} for the application.</p>
              </div>
            </div>

            <div className="mt-6">
              {section === "general" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm">App URL</label>
                    <Input value={appUrl} onChange={(e)=>setAppUrl((e.target as HTMLInputElement).value)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={smtpDebug} onCheckedChange={(v:any)=>setSmtpDebug(!!v)} />
                    <span className="text-sm">SMTP Debug (log tokens)</span>
                  </div>
                </div>
              )}

              {section === "smtp" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm">Host</label>
                    <Input value={host} onChange={(e) => setHost((e.target as HTMLInputElement).value)} />
                  </div>
                  <div>
                    <label className="block text-sm">Port</label>
                    <Input value={String(port)} onChange={(e) => setPort((e.target as HTMLInputElement).value)} />
                  </div>
                  <div>
                    <label className="block text-sm">User</label>
                    <Input value={user} onChange={(e) => setUser((e.target as HTMLInputElement).value)} />
                  </div>
                  <div>
                    <label className="block text-sm">Pass</label>
                    <Input value={pass} onChange={(e) => setPass((e.target as HTMLInputElement).value)} />
                  </div>
                  <div>
                    <label className="block text-sm">From</label>
                    <Input value={from} onChange={(e) => setFrom((e.target as HTMLInputElement).value)} />
                  </div>
                </div>
              )}

              {section === "templates" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm">Reset Email Subject</label>
                    <Input value={resetSubject} onChange={(e)=>setResetSubject((e.target as HTMLInputElement).value)} />
                    <label className="block text-sm mt-2">Reset Email HTML</label>
                    <Textarea value={resetHtml} onChange={(e)=>setResetHtml((e.target as HTMLTextAreaElement).value)} />
                  </div>

                  <div>
                    <label className="block text-sm">Booking Confirmation Subject</label>
                    <Input value={bookingSubj} onChange={(e)=>setBookingSubj((e.target as HTMLInputElement).value)} />
                    <label className="block text-sm mt-2">Booking Confirmation HTML</label>
                    <Textarea value={bookingHtml} onChange={(e)=>setBookingHtml((e.target as HTMLTextAreaElement).value)} />
                  </div>
                </div>
              )}

              {section === "notifications" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3"><Switch checked={emailEnabled} onCheckedChange={(v:any)=>setEmailEnabled(!!v)} /><span>Email enabled</span></div>
                  <div className="flex items-center gap-3"><Switch checked={smsEnabled} onCheckedChange={(v:any)=>setSmsEnabled(!!v)} /><span>SMS enabled</span></div>
                  <div className="flex items-center gap-3"><Switch checked={notifyCreated} onCheckedChange={(v:any)=>setNotifyCreated(!!v)} /><span>Notify on booking created</span></div>
                  <div className="flex items-center gap-3"><Switch checked={notifyConfirmed} onCheckedChange={(v:any)=>setNotifyConfirmed(!!v)} /><span>Notify on booking confirmed</span></div>
                  <div className="flex items-center gap-3"><Switch checked={notifyCancelled} onCheckedChange={(v:any)=>setNotifyCancelled(!!v)} /><span>Notify on booking cancelled</span></div>
                </div>
              )}

              {section === "policies" && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm">Cancellation window (hrs)</label>
                    <Input type="number" value={String(cancellationWindowHours)} onChange={(e)=>setCancellationWindowHours(Number((e.target as HTMLInputElement).value))} />
                  </div>
                  <div>
                    <label className="block text-sm">Max duration (hrs)</label>
                    <Input type="number" value={String(maxDurationHours)} onChange={(e)=>setMaxDurationHours(Number((e.target as HTMLInputElement).value))} />
                  </div>
                  <div>
                    <label className="block text-sm">Min lead time (hrs)</label>
                    <Input type="number" value={String(minLeadTimeHours)} onChange={(e)=>setMinLeadTimeHours(Number((e.target as HTMLInputElement).value))} />
                  </div>
                  <div>
                    <label className="block text-sm">Buffer (mins)</label>
                    <Input type="number" value={String(bufferMinutes)} onChange={(e)=>setBufferMinutes(Number((e.target as HTMLInputElement).value))} />
                  </div>
                </div>
              )}

              {section === "locale" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm">Timezone</label>
                    <Input value={timezone} onChange={(e)=>setTimezone((e.target as HTMLInputElement).value)} />
                  </div>
                  <div>
                    <label className="block text-sm">Locale</label>
                    <Input value={locale} onChange={(e)=>setLocale((e.target as HTMLInputElement).value)} />
                  </div>
                  <div>
                    <label className="block text-sm">Currency</label>
                    <Input value={currency} onChange={(e)=>setCurrency((e.target as HTMLInputElement).value)} />
                  </div>
                </div>
              )}

              {section === "payments" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm">Payment Provider</label>
                    <Input value={pgProvider} onChange={(e)=>setPgProvider((e.target as HTMLInputElement).value)} />
                  </div>
                  <div>
                    <label className="block text-sm">Payment API Key</label>
                    <Input value={pgApiKey} onChange={(e)=>setPgApiKey((e.target as HTMLInputElement).value)} />
                  </div>
                  <div className="flex items-center gap-3"><Switch checked={pgTestMode} onCheckedChange={(v:any)=>setPgTestMode(!!v)} /><span>Payment test mode</span></div>
                  <div>
                    <label className="block text-sm">Default price/hr</label>
                    <Input type="number" value={String(defaultPricePerHour)} onChange={(e)=>setDefaultPricePerHour(Number((e.target as HTMLInputElement).value))} />
                  </div>
                  <div>
                    <label className="block text-sm">Tax %</label>
                    <Input type="number" value={String(taxPercent)} onChange={(e)=>setTaxPercent(Number((e.target as HTMLInputElement).value))} />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
