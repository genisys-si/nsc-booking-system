"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const bookingSchema = z.object({
  facilityId: z.string().min(1, "Select facility"),
  venueId: z.string().min(1, "Select venue"),
  startTime: z.string().min(1, "Start time required"),
  endTime: z.string().min(1, "End time required"),
  contactName: z.string().min(2, "Name required"),
  contactEmail: z.string().email("Valid email required"),
  purpose: z.string().optional(),
  attendees: z.coerce.number().min(1, "At least 1 attendee").optional(),
  notes: z.string().optional(),
  selectedAmenities: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof bookingSchema>;

interface BookingCreateFormProps {
  facilities: Array<{
    _id: string;
    name: string;
    venues: Array<{
      _id: string;
      name: string;
      pricePerHour: number;
      amenities: Array<{ _id: string; name: string; surcharge: number }>;
    }>;
  }>;
}

export default function BookingCreateForm({ facilities }: BookingCreateFormProps) {
  const router = useRouter();
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [pricePreview, setPricePreview] = useState({
    hours: 0,
    basePrice: 0,
    amenitySurcharge: 0,
    totalPrice: 0,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(bookingSchema) as any,
    defaultValues: {
      facilityId: "",
      venueId: "",
      startTime: "",
      endTime: "",
      contactName: "",
      contactEmail: "",
      purpose: "",
      attendees: 1,
      notes: "",
      selectedAmenities: [],
    },
  });

  // Safe selection
  const selectedFac = facilities.find(f => f._id === selectedFacility) ?? null;
  const selectedVen = selectedFac?.venues?.find(v => v._id.toString() === selectedVenue) ?? null;

  // Watch fields
  const [startTime, endTime, selectedAmenities = []] = form.watch([
    "startTime",
    "endTime",
    "selectedAmenities",
  ]);

  // Price preview
  useEffect(() => {
    if (!startTime || !endTime || !selectedVen) {
      setPricePreview({ hours: 0, basePrice: 0, amenitySurcharge: 0, totalPrice: 0 });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setPricePreview({ hours: 0, basePrice: 0, amenitySurcharge: 0, totalPrice: 0 });
      return;
    }

    const ms = end.getTime() - start.getTime();
    const hours = ms / (1000 * 60 * 60);
    if (hours <= 0) {
      setPricePreview({ hours: 0, basePrice: 0, amenitySurcharge: 0, totalPrice: 0 });
      return;
    }

    const base = hours * (selectedVen.pricePerHour ?? 0);

    const surcharge = selectedAmenities.reduce((sum: number, id: string) => {
      const am = selectedVen.amenities?.find(a => a._id.toString() === id);
      return sum + (am?.surcharge ?? 0);
    }, 0);

    setPricePreview({
      hours: Number(hours.toFixed(2)),
      basePrice: Number(base.toFixed(2)),
      amenitySurcharge: Number(surcharge.toFixed(2)),
      totalPrice: Number((base + surcharge).toFixed(2)),
    });
  }, [startTime, endTime, selectedAmenities, selectedVen]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      toast.success("Booking created successfully");
      router.push("/dashboard/bookings");
    } catch (err: any) {
      toast.error(err.message || "Failed to create booking");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Facility & Venue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Facility</label>
          <select
            {...form.register("facilityId")}
            onChange={e => {
              form.setValue("facilityId", e.target.value);
              form.setValue("venueId", "");
              setSelectedFacility(e.target.value);
            }}
            className="w-full border rounded-md p-2"
          >
            <option value="">
              {facilities.length === 0 ? "No facilities available" : "Select facility"}
            </option>
            {facilities.map(f => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </select>
          {form.formState.errors.facilityId && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.facilityId.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Venue</label>
          <select
            {...form.register("venueId")}
            onChange={e => {
              form.setValue("venueId", e.target.value);
              setSelectedVenue(e.target.value);
            }}
            className="w-full border rounded-md p-2"
            disabled={!selectedFacility}
          >
            <option value="">
              {selectedFacility ? "Select venue" : "Select facility first"}
            </option>
            {selectedFac?.venues?.map(v => (
              <option key={v._id} value={v._id}>
                {v.name} (${v.pricePerHour}/hr)
              </option>
            ))}
          </select>
          {form.formState.errors.venueId && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.venueId.message}
            </p>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <input
            type="datetime-local"
            {...form.register("startTime")}
            className="w-full border rounded-md p-2"
          />
          {form.formState.errors.startTime && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.startTime.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Time</label>
          <input
            type="datetime-local"
            {...form.register("endTime")}
            className="w-full border rounded-md p-2"
          />
          {form.formState.errors.endTime && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.endTime.message}
            </p>
          )}
        </div>
      </div>

      {/* Amenities Selection */}
      {selectedVen && selectedVen.amenities && selectedVen.amenities.length > 0 ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium">Extra Amenities</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedVen.amenities.map(am => (
              <div key={am._id} className="flex items-center space-x-2">
                <Checkbox
                  id={am._id}
                  checked={form.getValues("selectedAmenities")?.includes(am._id.toString()) ?? false}
                  onCheckedChange={checked => {
                    const current = form.getValues("selectedAmenities") || [];
                    const newValue = checked
                      ? [...current, am._id.toString()]
                      : current.filter(id => id !== am._id.toString());
                    form.setValue("selectedAmenities", newValue);
                  }}
                />
                <Label htmlFor={am._id} className="text-sm cursor-pointer">
                  {am.name} (+${am.surcharge?.toFixed(2) || "0.00"})
                </Label>
              </div>
            ))}
          </div>
        </div>
      ) : selectedVenue ? (
        <p className="text-sm text-muted-foreground italic">
          No extra amenities available for this venue.
        </p>
      ) : null}

      {/* Customer Contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Contact Name *</label>
          <input
            type="text"
            {...form.register("contactName")}
            className="w-full border rounded-md p-2"
          />
          {form.formState.errors.contactName && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.contactName.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contact Email *</label>
          <input
            type="email"
            {...form.register("contactEmail")}
            className="w-full border rounded-md p-2"
          />
          {form.formState.errors.contactEmail && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.contactEmail.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Attendees</label>
          <input
            type="number"
            min="1"
            {...form.register("attendees", { valueAsNumber: true })}
            className="w-full border rounded-md p-2"
          />
        </div>
      </div>

      {/* Purpose & Notes */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Purpose of Booking</label>
          <input
            type="text"
            {...form.register("purpose")}
            className="w-full border rounded-md p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Additional Notes</label>
          <textarea
            {...form.register("notes")}
            className="w-full border rounded-md p-2 min-h-25"
          />
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="bg-muted p-6 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold">Price Breakdown</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{pricePreview.hours.toFixed(2)} hours</span>
          </div>
          <div className="flex justify-between">
            <span>Venue Rate:</span>
            <span>${pricePreview.basePrice.toFixed(2)} SBD</span>
          </div>
          <div className="flex justify-between">
            <span>Amenities Surcharge:</span>
            <span>${pricePreview.amenitySurcharge.toFixed(2)} SBD</span>
          </div>
          <div className="flex justify-between pt-3 border-t font-bold text-lg">
            <span>Total:</span>
            <span>${pricePreview.totalPrice.toFixed(2)} SBD</span>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full md:w-auto">
        Create Booking
      </Button>
    </form>
  );
}