"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Image from "next/image";
import { format, isSameDay, isBefore, parse } from "date-fns";
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

export interface Amenity { _id: string; name: string; surcharge: number; }
export interface Venue { _id: string; name: string; pricePerHour: number; photo?: string; amenities: Amenity[]; }
export interface Facility { _id: string; name: string; photo?: string; venues: Venue[]; }
export type AvailabilityState = { loading: boolean; available: boolean | null; message: string; };
export type PricePreview = { hours: number; base: number; amenities: number; total: number; };
export type BookingResult = { invoiceId?: string; _id?: string; [key: string]: any; };

// ───────────────────────────────────────────────
// 30 MINS TIME SLOT (12-HOUR FORMAT)
// ───────────────────────────────────────────────
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour % 12 || 12;
      const ampm = hour < 12 ? "AM" : "PM";
      const m = minute.toString().padStart(2, '0');
      slots.push(`${h}:${m} ${ampm}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Internal logic helper to handle 12h math
const to24h = (time12h: string) => {
  if (!time12h) return "00:00";
  try {
    return format(parse(time12h, "h:mm a", new Date()), "HH:mm");
  } catch { return "00:00"; }
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
}).refine((data) => {
  return to24h(data.endTime) > to24h(data.startTime);
}, {
  message: "End time must be after start time", 
  path: [ "endTime"],
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
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const form = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      facilityId: "", venueId: "", startDate: undefined, endDate: undefined,
      startTime: "", endTime: "", selectedAmenities: [], attendees: 1,
      purpose: "", notes: "", contactName: "", contactEmail: "", contactPhone: "",
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
        console.log("Loaded facilities:", data);
      })
      .catch(() => {
        toast.error("Failed to load facilities");
        setLoadingFacilities(false);
      });
  }, []);

  // Load booked dates
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
        if (data.dates) setBookedDates(data.dates.map((d: string) => new Date(d)));
        setLoadingVenues(false);
      })
      .catch(() => {
        setBookedDates([]);
        setLoadingVenues(false);
      });
  }, [watch("venueId")]);

  // Availability check
  useEffect(() => {
    const { venueId, startDate, endDate, startTime, endTime } = watch();
    if (!venueId || !startDate || !endDate || !startTime || !endTime) {
      setAvailability({ loading: false, available: null, message: "" });
      return;
    }

    const start = new Date(`${format(startDate, "yyyy-MM-dd")}T${to24h(startTime)}`);
    const end = new Date(`${format(endDate, "yyyy-MM-dd")}T${to24h(endTime)}`);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      setAvailability({ loading: false, available: false, message: "Invalid range" });
      return;
    }

    setAvailability({ loading: true, available: null, message: "Checking..." });
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/availability?venueId=${venueId}&startTime=${start.toISOString()}&endTime=${end.toISOString()}`);
        const data = await res.json();
        setAvailability({ loading: false, available: data.available, message: data.available ? "Available" : "Booked" });
      } catch {
        setAvailability({ loading: false, available: false, message: "Error" });
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [watch("venueId"), watch("startDate"), watch("endDate"), watch("startTime"), watch("endTime")]);

  // Price calculation logic (This replaces the state version to ensure live updates)
  const pricePreview = useMemo(() => {
    const { venueId, facilityId, startTime, endTime, startDate, endDate, selectedAmenities } = watch();
    if (!venueId || !startTime || !endTime || !startDate || !endDate) return { hours: 0, base: 0, amenities: 0, total: 0 };

    const start = new Date(`${format(startDate, "yyyy-MM-dd")}T${to24h(startTime)}`);
    const end = new Date(`${format(endDate, "yyyy-MM-dd")}T${to24h(endTime)}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return { hours: 0, base: 0, amenities: 0, total: 0 };

    const hours = (end.getTime() - start.getTime()) / (3600 * 1000);
    const facility = facilities.find(f => f._id === facilityId);
    const venue = facility?.venues?.find((v: any) => v._id === venueId);

    if (!venue) return { hours, base: 0, amenities: 0, total: 0 };

    const base = hours * (venue.pricePerHour || 0);
    const amenitiesTotal = (selectedAmenities || []).reduce((sum: number, id: string) => {
      const am = venue.amenities?.find((a: any) => a._id === id);
      return sum + (am?.surcharge || 0);
    }, 0);

    return { hours, base, amenities: amenitiesTotal, total: base + amenitiesTotal };
  }, [watch(), facilities]);

  const nextStep = async () => {
    let fields: (keyof WizardData)[] = [];
    if (step === 1) fields = ["facilityId", "venueId"];
    if (step === 2) fields = ["venueId"];
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
          startTime: `${format(data.startDate!, "yyyy-MM-dd")}T${to24h(data.startTime)}`,
          endTime: `${format(data.endDate!, "yyyy-MM-dd")}T${to24h(data.endTime)}`,
        }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
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
    <Card className="border-0 min-h-[80vh] w-min-full flex flex-col">
      <CardContent className="p-6 md:p-12 flex-1 flex flex-col">
        {/* Stepper */}
        <div className="mb-12">
          <div className="flex justify-between">
            {steps.map((s, i) => (
              <div key={i} className="flex-1 text-center">
                <div className={cn("w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-bold border-2", step >= i + 1 ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-muted")}>
                  {step > i + 1 ? <Check className="h-5 w-5" /> : i + 1}
                </div>
                <p className="mt-2 text-sm font-medium">{s.title}</p>
              </div>
            ))}
          </div>
        </div>

        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 flex-1 flex flex-col">
            {step === 1 && <StepFacility form={form} facilities={facilities} loading={loadingFacilities} setStep={setStep} />}
            {step === 2 && <StepVenue form={form} facilities={facilities} setStep={setStep} />}
            {step === 3 && <StepDateTime form={form} bookedDates={bookedDates} availability={availability} />}
            {step === 4 && <StepExtras form={form} facilities={facilities} />}
            {step === 5 && <StepInfo form={form} />}
            {step === 6 && <StepReview form={form} facilities={facilities} pricePreview={pricePreview} />}
            {step === 7 && <div className="flex-1 flex items-center justify-center"><StepSuccess bookingResult={bookingResult} /></div>}

            {step < 6 && (
              <div className="flex justify-between mt-auto pt-12">
                {step > 1 && <Button type="button" variant="outline" size="lg" onClick={prevStep}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>}
                <Button type="button" size="lg" onClick={nextStep} className="ml-auto">Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
              </div>
            )}
            
            {step === 6 && (
              <div className="flex justify-between mt-auto pt-12">
                <Button type="button" variant="outline" size="lg" onClick={prevStep}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
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

function StepFacility({ form, facilities, loading, setStep }: any) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardContent className="p-4"><Skeleton className="h-6 w-3/4 mb-2" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {facilities.map((facility: any) => (
        <Card key={facility._id} className={cn("cursor-pointer overflow-hidden transition-all hover:shadow-lg", form.watch("facilityId") === facility._id && "ring-2 ring-primary")} onClick={() => { form.setValue("facilityId", facility._id); setStep(2); }}>
          <div className="relative h-48">{facility.coverImage ? <Image src={facility.coverImage} alt={facility.name} fill className="object-cover" /> : <div className="h-full bg-muted flex items-center justify-center">No photo</div>}</div>
          <CardContent className="p-4"><h3 className="font-semibold text-lg">{facility.name}</h3><p className="text-sm text-muted-foreground mt-1">{facility.venues?.length || 0} venues</p></CardContent>
        </Card>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 2: Venues
// ───────────────────────────────────────────────

function StepVenue({ form, facilities, setStep }: any) {
  const selectedFacility = facilities.find((f: any) => f._id === form.watch("facilityId"));
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4"><Button variant="ghost" size="sm" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button><h2 className="text-xl font-semibold">{selectedFacility?.name}</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {selectedFacility?.venues.map((venue: any) => (
          
          <Card key={venue._id} className={cn("cursor-pointer overflow-hidden transition-all hover:shadow-lg", form.watch("venueId") === venue._id && "ring-2 ring-primary")} onClick={() => { form.setValue("venueId", venue._id); setStep(3); }}>
            <div className="relative h-48">{venue.images && venue.images.length > 0 ? <Image src={venue.images[0]} alt={venue.name} fill className="object-cover" /> : <div className="h-full bg-muted flex items-center justify-center">No photo</div>}</div>
            <CardContent className="p-4"><h3 className="font-semibold">{venue.name}</h3><p className="text-sm text-muted-foreground mt-1">${venue.pricePerHour}/hr</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 3: Date & Time
// ───────────────────────────────────────────────

function StepDateTime({ form, bookedDates, availability }: any) {
  const startTime = form.watch("startTime");
  const filteredEndTimeSlots = useMemo(() => {
    if (!startTime) return TIME_SLOTS;
    return TIME_SLOTS.filter((slot) => to24h(slot) > to24h(startTime));
  }, [startTime]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" /> 
                {form.watch("startDate") ? format(form.watch("startDate"), "PPP") : <span>Pick date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar 
                mode="single" 
                selected={form.watch("startDate")} 
                onSelect={d => d && form.setValue("startDate", d)} 
                // FIXED TYPE HERE: (b: Date)
                disabled={d => isBefore(d, new Date()) || bookedDates.some((b: Date) => isSameDay(b, d))} 
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" /> 
                {form.watch("endDate") ? format(form.watch("endDate"), "PPP") : <span>Pick date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar 
                mode="single" 
                selected={form.watch("endDate")} 
                onSelect={d => d && form.setValue("endDate", d)} 
                // FIXED TYPE HERE: (b: Date)
                disabled={d => isBefore(d, new Date()) || bookedDates.some((b: Date) => isSameDay(b, d))} 
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {/* ... rest of the component remains the same ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Start Time</Label>
          <Select onValueChange={v => form.setValue("startTime", v)} value={startTime}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{TIME_SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>End Time</Label>
          <Select onValueChange={v => form.setValue("endTime", v)} value={form.watch("endTime")} disabled={!startTime}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{filteredEndTimeSlots.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className={cn("p-4 rounded-lg border text-center font-medium", availability.available ? "border-green-300 bg-green-50 text-green-800" : "bg-gray-50")}>
        {availability.message || "Select slot"}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 4: Extras
// ───────────────────────────────────────────────

function StepExtras({ form, facilities }: any) {
  const venue = facilities.find((f: any) => f._id === form.watch("facilityId"))?.venues.find((v: any) => v._id === form.watch("venueId"));
  return (
    <div className="space-y-6">
      {venue?.amenities?.length > 0 && (
        <div className="space-y-4">
          <Label>Extra Amenities</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {venue.amenities.map((am: any) => (
              <div key={am._id} className="flex items-center space-x-2">
                <Checkbox id={am._id} checked={form.watch("selectedAmenities")?.includes(am._id)} onCheckedChange={checked => {
                  const current = form.watch("selectedAmenities") || [];
                  form.setValue("selectedAmenities", checked ? [...current, am._id] : current.filter((id: string) => id !== am._id));
                }} />
                <Label htmlFor={am._id}>{am.name} (+${am.surcharge})</Label>
              </div>
            ))}
          </div>
        </div>
      )}
      <div><Label>Attendees</Label><Input type="number" {...form.register("attendees", { valueAsNumber: true })} /></div>
      <div><Label>Purpose</Label><Input {...form.register("purpose")} /></div>
      <div><Label>Notes</Label><Textarea {...form.register("notes")} /></div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 5: Contact
// ───────────────────────────────────────────────

function StepInfo({ form }: any) {
  return (
    <div className="space-y-6">
      <div><Label>Full Name</Label><Input {...form.register("contactName")} /></div>
      <div><Label>Email</Label><Input type="email" {...form.register("contactEmail")} /></div>
      <div><Label>Phone (optional)</Label><Input {...form.register("contactPhone")} /></div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 6: Review
// ───────────────────────────────────────────────

function StepReview({ form, facilities, pricePreview }: any) {
  const values = form.getValues();
  const facility = facilities.find((f: any) => f._id === values.facilityId);
  const venue = facility?.venues?.find((v: any) => v._id === values.venueId);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-center">Review Your Booking</h2>
      <div className="grid gap-6">
        <Card><CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground block">Facility</span>{facility?.name}</div>
            <div><span className="text-muted-foreground block">Venue</span>{venue?.name}</div>
            <div><span className="text-muted-foreground block">Time</span>{values.startTime} – {values.endTime}</div>
            <div><span className="text-muted-foreground block">Contact</span>{values.contactName}</div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <h3 className="font-semibold mb-4">Price Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Base</span><span>${pricePreview.base.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Amenities</span><span>${pricePreview.amenities.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>${pricePreview.total.toFixed(2)}</span></div>
          </div>
        </CardContent></Card>
      </div>
      <div className="text-center"><Button type="submit" size="lg">Confirm & Submit</Button></div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Step 7: Success
// ───────────────────────────────────────────────
function StepSuccess({ bookingResult }: { bookingResult: any }) {
  const handlePrint = () => {
    window.print();
  };

  // This ensures we find the ID regardless of how the API nests it
  const referenceId = 
    bookingResult?.bookingRef ||      
    "Confirmed";

    console.log("Booking Result:", bookingResult, "Reference ID:", referenceId);
  return (
    <div className="text-center space-y-8 w-full max-w-2xl print:p-0">
      <div className="flex justify-center print:hidden">
        <div className="rounded-full bg-green-100 p-8">
          <Check className="h-16 w-16 text-green-600" />
        </div>
      </div>

      <h2 className="text-3xl font-bold">Booking Submitted!</h2>
      <p className="text-lg text-muted-foreground max-w-md mx-auto">
        Thank you! Your request has been received.
      </p>

      <div className="bg-muted p-6 rounded-lg max-w-md mx-auto border print:bg-white print:border-black">
        <p className="font-medium text-lg">
          Reference ID: <span className="font-mono">{referenceId}</span>
        </p>
        <p className="text-sm mt-2 text-muted-foreground">
          Please keep this ID for your records.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 print:hidden">
        
        <Button asChild variant="default" size="lg" className="w-full sm:w-auto">
          <a href="/book">Make Another Booking</a>
        </Button>
      </div>
    </div>
  );
}