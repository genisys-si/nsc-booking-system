"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Image from "next/image";
import { format, isSameDay, isBefore } from "date-fns";
import { ChevronLeft, ChevronRight, Check, AlertCircle, CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// ───────────────────────────────────────────────
// Types & Interfaces
// ───────────────────────────────────────────────

export interface Amenity {
  _id: string;
  name: string;
  surcharge: number;
}

export interface Venue {
  _id: string;
  name: string;
  pricePerHour: number;
  photo?: string;
  amenities: Amenity[];
}

export interface Facility {
  _id: string;
  name: string;
  photo?: string;
  venues: Venue[];
}

export type AvailabilityState = {
  loading: boolean;
  available: boolean | null;
  message: string;
};

export type PricePreview = {
  hours: number;
  base: number;
  amenities: number;
  total: number;
};

export type BookingResult = {
  invoiceId?: string;
  _id?: string;
  [key: string]: any;
};

// ───────────────────────────────────────────────
// Form Schema
// ───────────────────────────────────────────────

const wizardSchema = z.object({
  facilityId: z.string().min(1, "Select a facility"),
  venueId: z.string().min(1, "Select a venue"),
  startDate: z.date({ message: "Start date is required" }),
  endDate: z.date({ message: "End date is required" }),
  startTime: z.string().min(1, "Start time required"),
  endTime: z.string().min(1, "End time required"),
  selectedAmenities: z.array(z.string()).optional(),
  attendees: z.number().min(1, "At least 1 attendee").optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  contactName: z.string().min(2, "Name is required"),
  contactEmail: z.string().email("Valid email required"),
  contactPhone: z.string().optional(),
});

type WizardData = z.infer<typeof wizardSchema>;

// ───────────────────────────────────────────────
// Main Wizard
// ───────────────────────────────────────────────

export function BookingWizard() {
  const [step, setStep] = useState(1);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [availability, setAvailability] = useState<AvailabilityState>({ loading: false, available: null, message: "" });
  const [pricePreview, setPricePreview] = useState<PricePreview>({ hours: 0, base: 0, amenities: 0, total: 0 });
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const form = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      facilityId: "",
      venueId: "",
      startDate: undefined,
      endDate: undefined,
      startTime: "",
      endTime: "",
      selectedAmenities: [],
      attendees: 1,
      purpose: "",
      notes: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const { watch, setValue, trigger, handleSubmit, getValues } = form;

  // Load facilities
  useEffect(() => {
    setLoadingFacilities(true);
    fetch("/api/facilities/public")
      .then(res => res.json())
      .then(data => {
        setFacilities(data);
        setLoadingFacilities(false);
      })
      .catch(() => {
        toast.error("Failed to load facilities");
        setLoadingFacilities(false);
      });
  }, []);

  // Load booked dates when venue changes
  useEffect(() => {
    const venueId = watch("venueId");
    if (!venueId) {
      setBookedDates([]);
      return;
    }

    setLoadingVenues(true);
    fetch(`/api/availability/booked-dates?venueId=${venueId}`)
      .then(res => res.json())
      .then(data => {
        if (data.dates) {
          setBookedDates(data.dates.map((d: string) => new Date(d)));
        }
        setLoadingVenues(false);
      })
      .catch(() => {
        setBookedDates([]);
        setLoadingVenues(false);
      });
  }, [watch("venueId")]);

  // Availability check
  useEffect(() => {
    const venueId = watch("venueId");
    const startDate = watch("startDate");
    const endDate = watch("endDate");
    const startTime = watch("startTime");
    const endTime = watch("endTime");

    if (!venueId || !startDate || !endDate || !startTime || !endTime) {
      setAvailability({ loading: false, available: null, message: "" });
      return;
    }

    const start = new Date(`${format(startDate, "yyyy-MM-dd")}T${startTime}`);
    const end = new Date(`${format(endDate, "yyyy-MM-dd")}T${endTime}`);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      setAvailability({ loading: false, available: false, message: "Invalid range" });
      return;
    }

    setAvailability({ loading: true, available: null, message: "Checking..." });

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/availability?venueId=${venueId}&startTime=${start.toISOString()}&endTime=${end.toISOString()}`
        );
        const data = await res.json();
        setAvailability({
          loading: false,
          available: data.available,
          message: data.available ? "Available" : "Booked",
        });
      } catch {
        setAvailability({ loading: false, available: false, message: "Error" });
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [watch("venueId"), watch("startDate"), watch("endDate"), watch("startTime"), watch("endTime")]);

  // Price preview
  const pricePreviewMemo = useMemo(() => {
    const venueId = watch("venueId");
    const startTime = watch("startTime");
    const endTime = watch("endTime");
    const startDate = watch("startDate");
    const endDate = watch("endDate");

    if (!venueId || !startTime || !endTime || !startDate || !endDate) {
      return { hours: 0, base: 0, amenities: 0, total: 0 };
    }

    const start = new Date(`${format(startDate, "yyyy-MM-dd")}T${startTime}`);
    const end = new Date(`${format(endDate, "yyyy-MM-dd")}T${endTime}`);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return { hours: 0, base: 0, amenities: 0, total: 0 };

    const hours = (end.getTime() - start.getTime()) / (3600 * 1000);

    const facility = facilities.find(f => f._id === watch("facilityId"));
    const venue = facility?.venues?.find((v: any) => v._id === venueId);

    if (!venue) return { hours, base: 0, amenities: 0, total: 0 };

    const base = hours * (venue.pricePerHour || 0);
    const amenitiesTotal = (watch("selectedAmenities") || []).reduce((sum: number, id: string) => {
      const am = venue.amenities?.find((a: any) => a._id === id);
      return sum + (am?.surcharge || 0);
    }, 0);

    return { hours, base, amenities: amenitiesTotal, total: base + amenitiesTotal };
  }, [watch(), facilities]);

  const nextStep = async () => {
    let fields: (keyof WizardData)[] = [];

    if (step === 1) fields = ["facilityId", "venueId"];
    if (step === 2) fields = ["venueId"]; // Ensure venue is selected
    if (step === 3) fields = ["startDate", "endDate", "startTime", "endTime"];
    if (step === 5) fields = ["contactName", "contactEmail"];

    const isValid = await trigger(fields);
    if (!isValid) return;

    if (step === 3 && !availability.available) {
      toast.error("Time slot not available");
      return;
    }

    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const onSubmit = async (data: WizardData) => {
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          startTime: `${format(data.startDate!, "yyyy-MM-dd")}T${data.startTime}`,
          endTime: `${format(data.endDate!, "yyyy-MM-dd")}T${data.endTime}`,
        }),
      });

      if (!res.ok) throw new Error();

      const result = await res.json();
      // Handle potential nested response structure (e.g. { booking: ... } or { data: ... })
      setBookingResult(result.booking || result.data || result);
      setStep(7);
      toast.success("Booking submitted!");
    } catch {
      toast.error("Submission failed");
    }
  };

  const steps = [
    { title: "Facility", desc: "Choose your facility" },
    { title: "Venue", desc: "Pick a venue" },
    { title: "Date & Time", desc: "Select available slot" },
    { title: "Extras", desc: "Add-ons & details" },
    { title: "Info", desc: "Your details" },
    { title: "Review", desc: "Confirm" },
  ];

  return (
    <Card className="border-0 shadow-xl">
      <CardContent className="p-6 md:p-10">
        {/* Stepper */}
        <div className="mb-10">
          <div className="flex justify-between">
            {steps.map((s, i) => (
              <div key={i} className="flex-1 text-center">
                <div
                  className={cn(
                    "w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-bold border-2",
                    step > i + 1 ? "bg-primary text-white border-primary" :
                    step === i + 1 ? "bg-primary text-white border-primary" :
                    "bg-muted text-muted-foreground border-muted"
                  )}
                >
                  {step > i + 1 ? <Check className="h-5 w-5" /> : i + 1}
                </div>
                <p className="mt-2 text-sm font-medium">{s.title}</p>
              </div>
            ))}
          </div>
        </div>

        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {step === 1 && <StepFacility form={form} facilities={facilities} loading={loadingFacilities} setStep={setStep} />}
            {step === 2 && <StepVenue form={form} facilities={facilities} setStep={setStep} />}
            {step === 3 && <StepDateTime form={form} bookedDates={bookedDates} availability={availability} />}
            {step === 4 && <StepExtras form={form} facilities={facilities} />}
            {step === 5 && <StepInfo form={form} />}
            {step === 6 && <StepReview form={form} facilities={facilities} pricePreview={pricePreview} />}
            {step === 7 && <StepSuccess bookingResult={bookingResult} />}

            {/* Navigation */}
            {step < 6 && (
              <div className="flex justify-between mt-12">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                )}
                <Button type="button" onClick={nextStep} className="ml-auto">
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Separate Navigation for Review Step to avoid fake submit */}
            {step === 6 && (
              <div className="flex justify-between mt-12">
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                {/* Submit is handled by the button inside StepReview, or we can add one here if preferred, 
                    but hiding the 'Next' button prevents the 'fake submit' issue. */}
              </div>
            )}
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────
// Step 1: Facilities with Images
// ───────────────────────────────────────────────

function StepFacility({
  form,
  facilities,
  loading,
  setStep,
}: {
  form: any;
  facilities: Facility[];
  loading: boolean;
  setStep: (step: number) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {facilities.map(facility => (
        <Card
          key={facility._id}
          className={cn(
            "cursor-pointer overflow-hidden transition-all hover:shadow-lg",
            form.watch("facilityId") === facility._id && "ring-2 ring-primary"
          )}
          onClick={() => {
            form.setValue("facilityId", facility._id);
            setStep(2); // move to venue selection
          }}
        >
          <div className="relative h-48">
            {facility.photo ? (
              <Image
                src={facility.photo}
                alt={facility.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full bg-muted flex items-center justify-center text-muted-foreground">
                No photo
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg">{facility.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {facility.venues?.length || 0} venues available
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 2: Venues of selected facility with photos
// ───────────────────────────────────────────────

function StepVenue({
  form,
  facilities,
  setStep,
}: {
  form: any;
  facilities: Facility[];
  setStep: (step: number) => void;
}) {
  const selectedFacility = facilities.find(f => f._id === form.watch("facilityId"));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Facilities
        </Button>
        <h2 className="text-xl font-semibold">{selectedFacility?.name}</h2>
      </div>

      {!selectedFacility || selectedFacility.venues.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No venues available in this facility.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedFacility.venues.map((venue: Venue) => (
            <Card
              key={venue._id}
              className={cn(
                "cursor-pointer overflow-hidden transition-all hover:shadow-lg",
                form.watch("venueId") === venue._id && "ring-2 ring-primary"
              )}
              onClick={() => {
                form.setValue("venueId", venue._id);
                setStep(3); // move to date/time
              }}
            >
              <div className="relative h-48">
                {venue.photo ? (
                  <Image
                    src={venue.photo}
                    alt={venue.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full bg-muted flex items-center justify-center text-muted-foreground">
                    No photo
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold">{venue.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  ${venue.pricePerHour}/hr • {venue.amenities?.length || 0} amenities
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 3: Date & Time with disabled booked dates
// ───────────────────────────────────────────────

function StepDateTime({
  form,
  bookedDates,
  availability,
}: {
  form: any;
  bookedDates: Date[];
  availability: AvailabilityState;
}) {
  const isDateDisabled = (date: Date) => {
    if (isBefore(date, new Date())) return true;
    return bookedDates.some(b => isSameDay(b, date));
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !form.watch("startDate") && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.watch("startDate") ? format(form.watch("startDate"), "PPP") : <span>Pick date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={form.watch("startDate")}
                onSelect={date => date && form.setValue("startDate", date)}
                disabled={isDateDisabled}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !form.watch("endDate") && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.watch("endDate") ? format(form.watch("endDate"), "PPP") : <span>Pick date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={form.watch("endDate")}
                onSelect={date => date && form.setValue("endDate", date)}
                disabled={isDateDisabled}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Start Time</Label>
          <Input type="time" {...form.register("startTime")} />
        </div>
        <div>
          <Label>End Time</Label>
          <Input type="time" {...form.register("endTime")} />
        </div>
      </div>

      {/* Availability */}
      <div className={cn(
        "p-4 rounded-lg border text-center font-medium",
        availability.available === true ? "border-green-300 bg-green-50 text-green-800" :
        availability.available === false ? "border-red-300 bg-red-50 text-red-800" :
        "border-gray-300 bg-gray-50 text-gray-700"
      )}>
        {availability.loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Checking...
          </div>
        ) : availability.message ? (
          <div className="flex items-center justify-center gap-2">
            {availability.available === false && <AlertCircle className="h-5 w-5" />}
            {availability.message}
          </div>
        ) : (
          "Select date and time to check availability"
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 4: Extras (Amenities, Attendees, Purpose, Notes)
// ───────────────────────────────────────────────

function StepExtras({ form, facilities }: { form: any; facilities: Facility[] }) {
  const facilityId = form.watch("facilityId");
  const venueId = form.watch("venueId");
  const facility = facilities.find(f => f._id === facilityId);
  const selectedVenue = facility?.venues.find(v => v._id === venueId);

  return (
    <div className="space-y-6">
      {selectedVenue && selectedVenue.amenities.length > 0 && (
        <div className="space-y-4">
          <Label>Extra Amenities</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedVenue.amenities.map((am: Amenity) => (
              <div key={am._id} className="flex items-center space-x-2">
                <Checkbox
                  id={am._id}
                  checked={form.watch("selectedAmenities")?.includes(am._id) ?? false}
                  onCheckedChange={checked => {
                    const current = form.watch("selectedAmenities") || [];
                    const updated = checked ? [...current, am._id] : current.filter((id: string) => id !== am._id);
                    form.setValue("selectedAmenities", updated);
                  }}
                />
                <Label htmlFor={am._id} className="text-sm cursor-pointer">
                  {am.name} (+${am.surcharge?.toFixed(2) || "0.00"})
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Number of Attendees</Label>
        <Input type="number" min={1} {...form.register("attendees", { valueAsNumber: true })} />
      </div>

      <div>
        <Label>Purpose</Label>
        <Input {...form.register("purpose")} placeholder="e.g. Conference" />
      </div>

      <div>
        <Label>Additional Notes</Label>
        <Textarea {...form.register("notes")} placeholder="Any special requests..." />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 5: Contact Info
// ───────────────────────────────────────────────

function StepInfo({ form }: { form: any }) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Full Name</Label>
        <Input {...form.register("contactName")} placeholder="Your name" />
      </div>

      <div>
        <Label>Email</Label>
        <Input type="email" {...form.register("contactEmail")} placeholder="your@email.com" />
      </div>

      <div>
        <Label>Phone (optional)</Label>
        <Input type="tel" {...form.register("contactPhone")} placeholder="+123..." />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 6: Review & Submit
// ───────────────────────────────────────────────

function StepReview({ form, facilities, pricePreview }: { form: any; facilities: Facility[]; pricePreview: PricePreview }) {
  const values = form.getValues();
  const facility = facilities.find(f => f._id === values.facilityId);
  const venue = facility?.venues?.find((v: any) => v._id === values.venueId);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-center">Review Your Booking</h2>

      <div className="grid gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium block text-muted-foreground">Facility</span>
                {facility?.name || "—"}
              </div>
              <div>
                <span className="font-medium block text-muted-foreground">Venue</span>
                {venue?.name || "—"}
              </div>
              <div>
                <span className="font-medium block text-muted-foreground">Date</span>
                {values.startDate ? format(values.startDate, "PPP") : "—"}
              </div>
              <div>
                <span className="font-medium block text-muted-foreground">Time</span>
                {values.startTime} – {values.endTime}
              </div>
              <div>
                <span className="font-medium block text-muted-foreground">Attendees</span>
                {values.attendees || "—"}
              </div>
              <div>
                <span className="font-medium block text-muted-foreground">Contact</span>
                {values.contactName} ({values.contactEmail})
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Price Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Duration</span>
                <span>{pricePreview.hours.toFixed(2)} hours</span>
              </div>
              <div className="flex justify-between">
                <span>Base Price</span>
                <span>${pricePreview.base.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Amenities</span>
                <span>${pricePreview.amenities.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold pt-3 border-t">
                <span>Total</span>
                <span>${pricePreview.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button type="submit" size="lg" className="px-10">
          Confirm & Submit Booking
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 7: Success
// ───────────────────────────────────────────────

function StepSuccess({ bookingResult }: { bookingResult: BookingResult | null }) {
  return (
    <div className="text-center space-y-8 py-16">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 p-8">
          <Check className="h-16 w-16 text-green-600" />
        </div>
      </div>

      <h2 className="text-3xl font-bold">Booking Submitted!</h2>
      <p className="text-lg text-muted-foreground max-w-md mx-auto">
        Thank you! Your request has been received. We will review and confirm within 24 hours.
      </p>

      <div className="bg-muted p-6 rounded-lg max-w-md mx-auto">
        <p className="font-medium">Reference ID: {bookingResult?.invoiceId || bookingResult?._id || bookingResult?.id || "Processing..."}</p>
        <p className="text-sm mt-2">
          A confirmation email has been sent.
        </p>
      </div>

      <Button asChild variant="outline" size="lg" className="mt-8">
        <a href="/">Make Another Booking</a>
      </Button>
    </div>
  );
}