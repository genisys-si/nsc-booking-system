"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useForm, FormProvider, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Image from "next/image";
import { format, isSameDay, isBefore, parse, startOfDay, startOfToday } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ImageOff,
  Loader2,
  Mail,
  MapPin,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ───────────────────────────────────────────────
// Types & Interfaces
// ───────────────────────────────────────────────

export interface Amenity { _id: string; name: string; surcharge: number; }
export interface Venue { _id: string; name: string; pricePerHour: number; images?: string[]; amenities: Amenity[]; isBookable: boolean; }
export interface Facility { _id: string; name: string; coverImage?: string; venues: Venue[]; }
export type AvailabilityState = { loading: boolean; available: boolean | null; message: string; };
export type PricePreview = { hours: number; base: number; amenities: number; tax: number; total: number; };
export type BookedRange = { start: number; end: number; };
export type BookingResult = { invoiceId?: string; _id?: string; bookingRef?: string; [key: string]: unknown; };

type PublicSettings = {
  currency?: string;
  bookingPolicies?: { minLeadTimeHours?: number; maxDurationHours?: number };
  defaultPricing?: { defaultPricePerHour?: number; taxPercent?: number };
};

// ───────────────────────────────────────────────
// 30 MINS TIME SLOT (12-HOUR FORMAT)
// ───────────────────────────────────────────────
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour % 12 || 12;
      const ampm = hour < 12 ? "AM" : "PM";
      const m = minute.toString().padStart(2, "0");
      slots.push(`${h}:${m} ${ampm}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();
const DURATION_PRESETS = [1, 2, 3, 4];
const SLOT_MS = 30 * 60 * 1000;

const overlaps = (start: number, end: number, ranges: BookedRange[]) =>
  ranges.some(r => start < r.end && end > r.start);

// Internal logic helper to handle 12h math
const to24h = (time12h: string) => {
  if (!time12h) return "00:00";
  try {
    return format(parse(time12h, "h:mm a", new Date()), "HH:mm");
  } catch { return "00:00"; }
};

const combine = (date: Date | undefined, time12h: string) =>
  date && time12h ? new Date(`${format(date, "yyyy-MM-dd")}T${to24h(time12h)}`) : null;

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatHours = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return [h && `${h} hr${h === 1 ? "" : "s"}`, m && `${m} min`].filter(Boolean).join(" ");
};

// ───────────────────────────────────────────────
// Form Schema
// ───────────────────────────────────────────────

const wizardSchema = z.object({
  facilityId: z.string().min(1, "Select a facility"),
  venueId: z.string().min(1, "Select a venue"),
  startDate: z.date({ message: "Pick a date" }),
  endDate: z.date({ message: "Pick an end date" }),
  startTime: z.string().min(1, "Pick a start time"),
  endTime: z.string().min(1, "Pick an end time"),
  selectedAmenities: z.array(z.string()).optional(),
  attendees: z.number({ message: "Enter a number" }).min(1, "At least 1 attendee").optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  contactName: z.string().min(2, "Please enter your full name"),
  contactEmail: z.string().email("Please enter a valid email"),
  contactPhone: z.string().optional(),
}).refine((data) => {
  const start = combine(data.startDate, data.startTime);
  const end = combine(data.endDate, data.endTime);
  return !start || !end || end > start;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

type WizardData = z.infer<typeof wizardSchema>;
type WizardForm = UseFormReturn<WizardData>;

const STEPS = [
  { title: "Venue", desc: "Where would you like to play?" },
  { title: "Date & time", desc: "When do you need it?" },
  { title: "Your details", desc: "Tell us who's booking" },
  { title: "Review", desc: "Check everything looks right" },
];

// ───────────────────────────────────────────────
// Main Wizard
// ───────────────────────────────────────────────

export function BookingWizard() {
  const [step, setStep] = useState(1);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [availability, setAvailability] = useState<AvailabilityState>({ loading: false, available: null, message: "" });
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const form = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      facilityId: "", venueId: "", startDate: undefined, endDate: undefined,
      startTime: "", endTime: "", selectedAmenities: [], attendees: 1,
      purpose: "", notes: "", contactName: "", contactEmail: "", contactPhone: "",
    },
  });

  const { watch, trigger, handleSubmit, formState } = form;
  const values = watch();
  const { facilityId, venueId, startDate, endDate, startTime, endTime, selectedAmenities } = values;

  const currency = settings?.currency || "SBD";
  const facility = facilities.find(f => f._id === facilityId);
  const venue = facility?.venues?.find(v => v._id === venueId);

  // Load facilities and settings
  useEffect(() => {
    fetch("/api/facilities/public")
      .then(res => res.json())
      .then(data => setFacilities(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load facilities"))
      .finally(() => setLoadingFacilities(false));

    fetch("/api/settings")
      .then(res => res.json())
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  // Load booked dates
  useEffect(() => {
    if (!venueId) {
      setBookedRanges([]);
      return;
    }
    fetch(`/api/bookings/booked-dates?venueId=${venueId}`)
      .then(res => res.json())
      .then(data => setBookedRanges((data.bookings || []).map((b: { startTime: string; endTime: string }) => ({
        start: new Date(b.startTime).getTime(),
        end: new Date(b.endTime).getTime(),
      }))))
      .catch(() => setBookedRanges([]));
  }, [venueId]);

  // Availability check
  const startMs = combine(startDate, startTime)?.getTime();
  const endMs = combine(endDate, endTime)?.getTime();

  useEffect(() => {
    if (!venueId || !startMs || !endMs) {
      setAvailability({ loading: false, available: null, message: "" });
      return;
    }
    if (endMs <= startMs) {
      setAvailability({ loading: false, available: false, message: "End time must be after start time" });
      return;
    }

    setAvailability({ loading: true, available: null, message: "Checking availability…" });
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/availability?venueId=${venueId}&startTime=${new Date(startMs).toISOString()}&endTime=${new Date(endMs).toISOString()}`);
        const data = await res.json();
        setAvailability({
          loading: false,
          available: !!data.available,
          message: data.available ? "This time is available" : "Already booked — try another time",
        });
      } catch {
        setAvailability({ loading: false, available: false, message: "Couldn't check availability. Please try again." });
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [venueId, startMs, endMs]);

  // Live price, mirroring the server calculation in /api/bookings
  const pricePreview = useMemo<PricePreview>(() => {
    const empty = { hours: 0, base: 0, amenities: 0, tax: 0, total: 0 };
    if (!venue) return empty;

    const rate = venue.pricePerHour > 0 ? venue.pricePerHour : (settings?.defaultPricing?.defaultPricePerHour ?? 0);
    const hours = startMs && endMs && endMs > startMs ? (endMs - startMs) / 3_600_000 : 0;
    const base = hours * rate;
    const amenities = (selectedAmenities || []).reduce((sum, id) => {
      return sum + (venue.amenities?.find(a => a._id === id)?.surcharge || 0);
    }, 0);
    const taxPercent = settings?.defaultPricing?.taxPercent ?? 0;
    const tax = Math.round((base + amenities) * (taxPercent / 100) * 100) / 100;
    return { hours, base, amenities, tax, total: base + amenities + tax };
  }, [venue, settings, startMs, endMs, selectedAmenities]);

  const goTo = (target: number) => {
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextStep = async () => {
    let fields: (keyof WizardData)[] = [];
    if (step === 1) fields = ["facilityId", "venueId"];
    if (step === 2) fields = ["startDate", "endDate", "startTime", "endTime"];
    if (step === 3) fields = ["contactName", "contactEmail", "attendees"];

    const isValid = await trigger(fields);
    if (!isValid) {
      if (step === 1) toast.error(facilityId ? "Choose a venue to continue" : "Choose a facility to continue");
      return;
    }

    if (step === 2) {
      if (availability.loading) {
        toast.message("Still checking availability…");
        return;
      }
      if (!availability.available) {
        toast.error("That time slot isn't available");
        return;
      }

      const minLeadHours = settings?.bookingPolicies?.minLeadTimeHours ?? 2;
      if (startMs! < Date.now() + minLeadHours * 3_600_000) {
        toast.error(`Bookings must be made at least ${minLeadHours} hours in advance`);
        return;
      }

      const maxHours = settings?.bookingPolicies?.maxDurationHours;
      if (maxHours && pricePreview.hours > maxHours) {
        toast.error(`Bookings can't be longer than ${maxHours} hours`);
        return;
      }
    }
    goTo(step + 1);
  };

  const onSubmit = async (data: WizardData) => {
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          startTime: combine(data.startDate, data.startTime)!.toISOString(),
          endTime: combine(data.endDate, data.endTime)!.toISOString(),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || result.error || "Submission failed");
      }

      setBookingResult(result.booking || result.data || result);
      goTo(5);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    }
  };

  if (step === 5) {
    return <StepSuccess bookingResult={bookingResult} email={values.contactEmail} />;
  }

  const current = STEPS[step - 1];

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Stepper step={step} onStepClick={goTo} />

        <div className="grid gap-8 lg:grid-cols-[1fr_340px] items-start">
          {/* Main panel */}
          <div className="min-w-0">
            <div className="mb-6">
              <p className="text-sm font-medium text-primary">Step {step} of {STEPS.length}</p>
              <h2 className="text-2xl font-semibold tracking-tight mt-1">{current.desc}</h2>
            </div>

            <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {step === 1 && <StepVenue form={form} facilities={facilities} loading={loadingFacilities} currency={currency} />}
              {step === 2 && <StepDateTime form={form} bookedRanges={bookedRanges} availability={availability} hours={pricePreview.hours} />}
              {step === 3 && <StepDetails form={form} venue={venue} currency={currency} />}
              {step === 4 && <StepReview form={form} facility={facility} venue={venue} pricePreview={pricePreview} currency={currency} onEdit={goTo} />}
            </div>

            {/* Navigation */}
            <div className="sticky bottom-0 z-10 -mx-4 mt-10 border-t bg-background/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
              <div className="flex items-center gap-3">
                {step > 1 && (
                  <Button type="button" variant="ghost" size="lg" onClick={() => goTo(step - 1)}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                )}
                {pricePreview.total > 0 && (
                  <div className="lg:hidden">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold">{formatMoney(pricePreview.total, currency)}</p>
                  </div>
                )}
                {step < 4 ? (
                  <Button type="button" size="lg" className="ml-auto rounded-full px-8" onClick={nextStep}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" size="lg" className="ml-auto rounded-full px-8" disabled={formState.isSubmitting}>
                    {formState.isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <>Confirm booking <Check className="h-4 w-4" /></>}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <aside className="hidden lg:block sticky top-28">
            <BookingSummary facility={facility} venue={venue} values={values} pricePreview={pricePreview} currency={currency} />
          </aside>
        </div>
      </form>
    </FormProvider>
  );
}

// ───────────────────────────────────────────────
// Stepper
// ───────────────────────────────────────────────

function Stepper({ step, onStepClick }: { step: number; onStepClick: (s: number) => void }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <li key={s.title} className="flex flex-1 items-center gap-2 sm:gap-3 last:flex-none">
            <button
              type="button"
              disabled={!done}
              onClick={() => onStepClick(n)}
              className={cn("flex items-center gap-2 rounded-full text-sm font-medium transition-colors", done && "hover:text-primary cursor-pointer")}
              aria-current={active ? "step" : undefined}
            >
              <span className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                done && "bg-primary text-primary-foreground",
                active && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                !done && !active && "bg-muted text-muted-foreground",
              )}>
                {done ? <Check className="h-4 w-4" /> : n}
              </span>
              <span className={cn("hidden md:inline whitespace-nowrap", !active && !done && "text-muted-foreground")}>{s.title}</span>
            </button>
            {n < STEPS.length && (
              <span className={cn("h-0.5 flex-1 rounded-full transition-colors", done ? "bg-primary" : "bg-muted")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ───────────────────────────────────────────────
// Shared bits
// ───────────────────────────────────────────────

function SelectableCard({ selected, onClick, image, title, subtitle, badge }: {
  selected: boolean; onClick: () => void; image?: string; title: string; subtitle: string; badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card text-left transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected ? "border-primary ring-2 ring-primary shadow-md" : "border-border",
      )}
    >
      <div className="relative aspect-[16/10] bg-muted">
        {image ? (
          <Image src={image} alt={title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><ImageOff className="h-8 w-8 opacity-40" /></div>
        )}
        {badge && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">{badge}</span>
        )}
        <span className={cn(
          "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-all",
          selected ? "scale-100 opacity-100" : "scale-75 opacity-0",
        )}>
          <Check className="h-4 w-4" />
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold leading-tight">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-destructive">{message}</p>;
}

// ───────────────────────────────────────────────
// Step 1: Facility + Venue
// ───────────────────────────────────────────────

function StepVenue({ form, facilities, loading, currency }: { form: WizardForm; facilities: Facility[]; loading: boolean; currency: string }) {
  const facilityId = form.watch("facilityId");
  const venueId = form.watch("venueId");
  const selectedFacility = facilities.find(f => f._id === facilityId);
  const venues = (selectedFacility?.venues || []).filter(v => v.isBookable);

  // Scroll to the venue list after the user picks a facility (not when returning to this step)
  const venuesRef = useRef<HTMLElement>(null);
  const scrollToVenues = useRef(false);
  useEffect(() => {
    if (!scrollToVenues.current || !venuesRef.current) return;
    scrollToVenues.current = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    venuesRef.current.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [facilityId]);

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border">
            <Skeleton className="aspect-[16/10] w-full rounded-none" />
            <div className="p-4 space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/3" /></div>
          </div>
        ))}
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
        No facilities are open for booking right now.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Building2 className="h-4 w-4" /> Facility
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {facilities.map(f => {
            const count = (f.venues || []).filter(v => v.isBookable).length;
            return (
              <SelectableCard
                key={f._id}
                selected={facilityId === f._id}
                onClick={() => {
                  if (facilityId === f._id) {
                    venuesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  } else {
                    scrollToVenues.current = true;
                    form.setValue("facilityId", f._id, { shouldValidate: true });
                    form.setValue("venueId", "");
                    form.setValue("selectedAmenities", []);
                  }
                }}
                image={f.coverImage}
                title={f.name}
                subtitle={`${count} bookable venue${count === 1 ? "" : "s"}`}
              />
            );
          })}
        </div>
      </section>

      {selectedFacility && (
        <section ref={venuesRef} className="scroll-mt-28 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-4 w-4" /> Venues at {selectedFacility.name}
          </h3>
          {venues.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-12 text-center text-muted-foreground">
              No venues at this facility are bookable right now. Try another facility.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {venues.map(v => (
                <SelectableCard
                  key={v._id}
                  selected={venueId === v._id}
                  onClick={() => {
                    if (venueId !== v._id) {
                      form.setValue("venueId", v._id, { shouldValidate: true });
                      form.setValue("selectedAmenities", []);
                    }
                  }}
                  image={v.images?.[0]}
                  title={v.name}
                  subtitle={v.amenities?.length ? `${v.amenities.length} add-on${v.amenities.length === 1 ? "" : "s"} available` : "Standard hire"}
                  badge={v.pricePerHour > 0 ? `${formatMoney(v.pricePerHour, currency)}/hr` : undefined}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 2: Date & Time
// ───────────────────────────────────────────────

function StepDateTime({ form, bookedRanges, availability, hours }: {
  form: WizardForm; bookedRanges: BookedRange[]; availability: AvailabilityState; hours: number;
}) {
  const { errors } = form.formState;
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const startTime = form.watch("startTime");
  const endTime = form.watch("endTime");
  const [multiDay, setMultiDay] = useState(!!startDate && !!endDate && !isSameDay(startDate, endDate));

  // A day is only greyed out when every 30-min slot in it is already booked
  const isFullyBooked = (d: Date) => {
    const dayStart = startOfDay(d).getTime();
    return TIME_SLOTS.every((_, i) => overlaps(dayStart + i * SLOT_MS, dayStart + (i + 1) * SLOT_MS, bookedRanges));
  };
  const isDisabledDay = (d: Date) => isBefore(d, startOfToday()) || isFullyBooked(d);

  // Hide start times that have already passed today; mark slots that are already booked
  const [now] = useState(() => Date.now());
  const startSlots = useMemo(() => {
    if (!startDate) return [];
    return TIME_SLOTS
      .map(s => {
        const t = combine(startDate, s)!.getTime();
        return { value: s, t, booked: overlaps(t, t + SLOT_MS, bookedRanges) };
      })
      .filter(s => s.t > now);
  }, [startDate, bookedRanges, now]);

  // End times must come after the start and can't run into the next booking
  const endSlots = useMemo(() => {
    const sameDay = !multiDay || (startDate && endDate && isSameDay(startDate, endDate));
    if (!startTime || !sameDay) return TIME_SLOTS.map(s => ({ value: s, booked: false }));
    const start = combine(startDate, startTime)!.getTime();
    return TIME_SLOTS
      .filter(s => to24h(s) > to24h(startTime))
      .map(s => ({ value: s, booked: overlaps(start, combine(startDate, s)!.getTime(), bookedRanges) }));
  }, [startTime, multiDay, startDate, endDate, bookedRanges]);

  const isEndBooked = (s?: string) => !!s && !!endSlots.find(e => e.value === s)?.booked;

  const setTime = (field: "startTime" | "endTime", v: string) => {
    form.setValue(field, v, { shouldValidate: form.formState.isSubmitted });
    if (field === "startTime" && endTime && to24h(endTime) <= to24h(v) && !multiDay) {
      form.setValue("endTime", "");
    }
  };

  const applyDuration = (h: number) => {
    const idx = TIME_SLOTS.indexOf(startTime);
    const end = TIME_SLOTS[idx + h * 2];
    if (end) form.setValue("endTime", end, { shouldValidate: true });
  };

  const pickStartDate = (d?: Date) => {
    if (!d) return;
    form.setValue("startDate", d, { shouldValidate: true });
    if (!multiDay || !endDate || isBefore(endDate, d)) form.setValue("endDate", d, { shouldValidate: true });
  };

  const toggleMultiDay = (on: boolean) => {
    setMultiDay(on);
    if (!on && startDate) form.setValue("endDate", startDate);
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[auto_1fr]">
      {/* Calendar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {multiDay ? "Start date" : "Date"}</Label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            Multi-day <Switch checked={multiDay} onCheckedChange={toggleMultiDay} />
          </label>
        </div>
        <div className="rounded-2xl border bg-card p-2 w-fit">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={pickStartDate}
            disabled={isDisabledDay}
            defaultMonth={startDate}
            className="[--cell-size:2.5rem]"
          />
        </div>
        <FieldError message={errors.startDate?.message} />

        {multiDay && (
          <div className="space-y-3 pt-2 animate-in fade-in duration-300">
            <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> End date</Label>
            <div className="rounded-2xl border bg-card p-2 w-fit">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={d => d && form.setValue("endDate", d, { shouldValidate: true })}
                disabled={d => isDisabledDay(d) || (!!startDate && isBefore(d, startDate))}
                defaultMonth={endDate || startDate}
                className="[--cell-size:2.5rem]"
              />
            </div>
            <FieldError message={errors.endDate?.message} />
          </div>
        )}
      </div>

      {/* Time */}
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Start time</Label>
            <Select onValueChange={v => setTime("startTime", v)} value={startTime} disabled={!startDate}>
              <SelectTrigger className="h-11 w-full"><SelectValue placeholder={startDate ? "Select start" : "Pick a date first"} /></SelectTrigger>
              <SelectContent className="max-h-72">{startSlots.map(s => <SlotItem key={s.value} value={s.value} booked={s.booked} />)}</SelectContent>
            </Select>
            <FieldError message={errors.startTime?.message} />
          </div>
          <div>
            <Label className="mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> End time</Label>
            <Select onValueChange={v => setTime("endTime", v)} value={endTime} disabled={!startTime}>
              <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Select end" /></SelectTrigger>
              <SelectContent className="max-h-72">{endSlots.map(s => <SlotItem key={s.value} value={s.value} booked={s.booked} />)}</SelectContent>
            </Select>
            <FieldError message={errors.endTime?.message} />
          </div>
        </div>

        {startTime && !multiDay && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quick duration</p>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map(h => {
                const idx = TIME_SLOTS.indexOf(startTime);
                const target = TIME_SLOTS[idx + h * 2];
                const active = target && target === endTime;
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={!target || isEndBooked(target)}
                    onClick={() => applyDuration(h)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
                      active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:text-primary",
                    )}
                  >
                    {h} hr{h > 1 && "s"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <AvailabilityBadge availability={availability} hours={hours} />
      </div>
    </div>
  );
}

function SlotItem({ value, booked }: { value: string; booked: boolean }) {
  return (
    <SelectItem value={value} disabled={booked}>
      {value}{booked && <span className="ml-2 text-xs text-muted-foreground">Booked</span>}
    </SelectItem>
  );
}

function AvailabilityBadge({ availability, hours }: { availability: AvailabilityState; hours: number }) {
  if (!availability.message) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        Pick a date and time to check availability.
      </div>
    );
  }

  const tone = availability.loading
    ? "border-border bg-muted/40 text-muted-foreground"
    : availability.available
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
  const Icon = availability.loading ? Loader2 : availability.available ? CheckCircle2 : XCircle;

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-4 text-sm font-medium", tone)} role="status" aria-live="polite">
      <Icon className={cn("h-5 w-5 shrink-0", availability.loading && "animate-spin")} />
      <span>{availability.message}</span>
      {availability.available && hours > 0 && <span className="ml-auto font-normal opacity-80">{formatHours(hours)}</span>}
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 3: Details (extras + contact)
// ───────────────────────────────────────────────

function StepDetails({ form, venue, currency }: { form: WizardForm; venue?: Venue; currency: string }) {
  const { errors } = form.formState;
  const selected = form.watch("selectedAmenities") || [];

  const toggleAmenity = (id: string) => {
    form.setValue("selectedAmenities", selected.includes(id) ? selected.filter(a => a !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="h-4 w-4" /> Contact
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="contactName" className="mb-2">Full name</Label>
            <Input id="contactName" className="h-11" autoComplete="name" placeholder="Jane Doe" aria-invalid={!!errors.contactName} {...form.register("contactName")} />
            <FieldError message={errors.contactName?.message} />
          </div>
          <div>
            <Label htmlFor="contactEmail" className="mb-2">Email</Label>
            <Input id="contactEmail" type="email" className="h-11" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.contactEmail} {...form.register("contactEmail")} />
            <FieldError message={errors.contactEmail?.message} />
          </div>
          <div>
            <Label htmlFor="contactPhone" className="mb-2">Phone <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="contactPhone" type="tel" className="h-11" autoComplete="tel" {...form.register("contactPhone")} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> About your event
        </h3>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <div>
            <Label htmlFor="purpose" className="mb-2">Purpose <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="purpose" className="h-11" placeholder="e.g. Training session, tournament" {...form.register("purpose")} />
          </div>
          <div>
            <Label htmlFor="attendees" className="mb-2">Attendees</Label>
            <Input id="attendees" type="number" min={1} className="h-11" aria-invalid={!!errors.attendees} {...form.register("attendees", { valueAsNumber: true })} />
            <FieldError message={errors.attendees?.message} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes" className="mb-2">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="notes" rows={3} placeholder="Anything we should know?" {...form.register("notes")} />
          </div>
        </div>
      </section>

      {!!venue?.amenities?.length && (
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-4 w-4" /> Add-ons
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {venue.amenities.map(am => {
              const on = selected.includes(am._id);
              return (
                <button
                  key={am._id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleAmenity(am._id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                    on ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50",
                  )}
                >
                  <span className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                  )}>
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="flex-1 font-medium">{am.name}</span>
                  <span className="text-sm text-muted-foreground">+{formatMoney(am.surcharge, currency)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 4: Review
// ───────────────────────────────────────────────

function StepReview({ form, facility, venue, pricePreview, currency, onEdit }: {
  form: WizardForm; facility?: Facility; venue?: Venue; pricePreview: PricePreview; currency: string; onEdit: (step: number) => void;
}) {
  const v = form.getValues();
  const amenities = (venue?.amenities || []).filter(a => v.selectedAmenities?.includes(a._id));

  const sections = [
    {
      title: "Venue", step: 1,
      rows: [["Facility", facility?.name], ["Venue", venue?.name]],
    },
    {
      title: "Date & time", step: 2,
      rows: [["When", formatWhen(v)], ["Duration", formatHours(pricePreview.hours)]],
    },
    {
      title: "Your details", step: 3,
      rows: [
        ["Name", v.contactName],
        ["Email", v.contactEmail],
        ["Phone", v.contactPhone],
        ["Attendees", v.attendees ? String(v.attendees) : undefined],
        ["Purpose", v.purpose],
        ["Add-ons", amenities.map(a => a.name).join(", ")],
        ["Notes", v.notes],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map(s => (
        <div key={s.title} className="rounded-2xl border p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">{s.title}</h3>
            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => onEdit(s.step)}>Edit</Button>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[120px_1fr]">
            {s.rows.filter(([, val]) => val).map(([label, val]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <div className="rounded-2xl border p-5 lg:hidden">
        <PriceBreakdown pricePreview={pricePreview} currency={currency} />
      </div>

      <p className="text-sm text-muted-foreground">
        Your booking will be submitted as a request and confirmed by NSC staff. We&apos;ll email you at each step.
      </p>
    </div>
  );
}

function formatWhen(v: Pick<WizardData, "startDate" | "endDate" | "startTime" | "endTime">) {
  if (!v.startDate || !v.startTime) return undefined;
  if (!v.endDate || isSameDay(v.startDate, v.endDate)) {
    return `${format(v.startDate, "EEE, d MMM yyyy")} · ${v.startTime} – ${v.endTime}`;
  }
  return `${format(v.startDate, "d MMM")} ${v.startTime} → ${format(v.endDate, "d MMM yyyy")} ${v.endTime}`;
}

// ───────────────────────────────────────────────
// Summary sidebar
// ───────────────────────────────────────────────

function BookingSummary({ facility, venue, values, pricePreview, currency }: {
  facility?: Facility; venue?: Venue; values: WizardData; pricePreview: PricePreview; currency: string;
}) {
  const image = venue?.images?.[0] || facility?.coverImage;
  const when = formatWhen(values);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="relative aspect-[16/9] bg-muted">
        {image ? (
          <Image src={image} alt={venue?.name || facility?.name || ""} fill sizes="340px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><Building2 className="h-8 w-8 opacity-40" /></div>
        )}
      </div>
      <div className="space-y-5 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your booking</p>
          <p className="mt-1 font-semibold leading-tight">{venue?.name || "No venue selected"}</p>
          {facility && <p className="text-sm text-muted-foreground">{facility.name}</p>}
        </div>

        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className={cn(!when && "text-muted-foreground")}>{when || "Date & time not set"}</span>
          </li>
          {values.contactEmail && (
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{values.contactEmail}</span>
            </li>
          )}
        </ul>

        <div className="border-t pt-4">
          <PriceBreakdown pricePreview={pricePreview} currency={currency} />
        </div>
      </div>
    </div>
  );
}

function PriceBreakdown({ pricePreview, currency }: { pricePreview: PricePreview; currency: string }) {
  if (pricePreview.hours === 0) {
    return <p className="text-sm text-muted-foreground">Pick a venue and time to see the price.</p>;
  }
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">Venue hire · {formatHours(pricePreview.hours)}</span><span>{formatMoney(pricePreview.base, currency)}</span></div>
      {pricePreview.amenities > 0 && (
        <div className="flex justify-between"><span className="text-muted-foreground">Add-ons</span><span>{formatMoney(pricePreview.amenities, currency)}</span></div>
      )}
      {pricePreview.tax > 0 && (
        <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(pricePreview.tax, currency)}</span></div>
      )}
      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="font-medium">Total</span>
        <span className="text-xl font-semibold">{formatMoney(pricePreview.total, currency)}</span>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Success
// ───────────────────────────────────────────────

function StepSuccess({ bookingResult, email }: { bookingResult: BookingResult | null; email: string }) {
  const referenceId = bookingResult?.bookingRef;

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(referenceId ?? "");
      toast.success("Reference copied");
    } catch {
      toast.error("Couldn't copy reference");
    }
  };

  return (
    <div className="mx-auto max-w-lg py-12 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
        <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
      </div>

      <h2 className="mt-6 text-3xl font-semibold tracking-tight">Request received</h2>
      <p className="mt-3 text-muted-foreground">
        Thanks! We&apos;ve sent the details to <span className="font-medium text-foreground">{email}</span>.
        NSC staff will review your booking and confirm shortly.
      </p>

      {referenceId && (
        <div className="mt-8 rounded-2xl border bg-muted/40 p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Booking reference</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="font-mono text-2xl font-semibold">{referenceId}</span>
            <Button type="button" variant="ghost" size="icon" onClick={copyRef} aria-label="Copy reference">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Keep this for your records.</p>
        </div>
      )}

      <Button asChild size="lg" className="mt-8 rounded-full px-8">
        <a href="/book">Make another booking</a>
      </Button>
    </div>
  );
}
