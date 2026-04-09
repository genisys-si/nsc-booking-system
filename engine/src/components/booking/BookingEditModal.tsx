"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Pencil, Calendar, Loader2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ── Types ────────────────────────────────────────────────────────────────────

interface AvailableAmenity {
  _id: string;
  name: string;
  surcharge: number;
}

interface BookingEditModalProps {
  bookingId: string;
  venueId: string;
  currentStartTime: string;   // ISO string
  currentEndTime: string;     // ISO string
  currentAmenityIds: string[];
  availableAmenities: AvailableAmenity[];
  pricePerHour: number;
  isAuthorized: boolean;
  // Contact info
  currentContactName: string;
  currentContactEmail: string;
  currentAttendees?: number;
  currentPurpose?: string;
  currentNotes?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert ISO string → value for <input type="datetime-local"> */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  // format: YYYY-MM-DDTHH:mm  (browser local time)
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookingEditModal({
  bookingId,
  venueId,
  currentStartTime,
  currentEndTime,
  currentAmenityIds,
  availableAmenities,
  pricePerHour,
  isAuthorized,
  currentContactName,
  currentContactEmail,
  currentAttendees,
  currentPurpose,
  currentNotes,
}: BookingEditModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [startTime, setStartTime] = useState(toDatetimeLocal(currentStartTime));
  const [endTime, setEndTime] = useState(toDatetimeLocal(currentEndTime));
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(
    new Set(currentAmenityIds)
  );
  // Contact info state
  const [contactName, setContactName] = useState(currentContactName);
  const [contactEmail, setContactEmail] = useState(currentContactEmail);
  const [attendees, setAttendees] = useState<string>(currentAttendees?.toString() ?? "");
  const [purpose, setPurpose] = useState(currentPurpose ?? "");
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [error, setError] = useState<string | null>(null);

  // ── Availability check ────────────────────────────────────────────────────
  type AvailStatus = "idle" | "checking" | "available" | "conflict";
  const [availStatus, setAvailStatus] = useState<AvailStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAvailability = useCallback(
    async (start: string, end: string) => {
      // Only check when dates actually differ from the saved originals
      const origStart = toDatetimeLocal(currentStartTime);
      const origEnd   = toDatetimeLocal(currentEndTime);
      if (start === origStart && end === origEnd) {
        setAvailStatus("idle");
        return;
      }

      const s = new Date(start);
      const e = new Date(end);
      if (!start || !end || isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) {
        setAvailStatus("idle");
        return;
      }

      setAvailStatus("checking");
      try {
        const params = new URLSearchParams({
          venueId,
          startTime: s.toISOString(),
          endTime:   e.toISOString(),
          excludeBookingId: bookingId,
        });
        const res  = await fetch(`/api/availability?${params}`);
        const data = await res.json();
        setAvailStatus(data.available ? "available" : "conflict");
      } catch {
        setAvailStatus("idle");  // silently ignore network errors
      }
    },
    [venueId, bookingId, currentStartTime, currentEndTime]
  );

  // Debounce: fire 600 ms after the user stops changing dates
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkAvailability(startTime, endTime);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [startTime, endTime, checkAvailability]);

  // ── Derived price preview ──────────────────────────────────────────────────

  const hours =
    startTime && endTime
      ? Math.max(
          0,
          (new Date(endTime).getTime() - new Date(startTime).getTime()) /
            (1000 * 60 * 60)
        )
      : 0;

  const basePrice = hours * pricePerHour;

  const amenitySurcharge = availableAmenities
    .filter((a) => selectedAmenities.has(a._id))
    .reduce((sum, a) => sum + (a.surcharge || 0), 0);

  const totalPrice = basePrice + amenitySurcharge;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleOpen = () => {
    // Reset to current saved values every time the modal opens
    setStartTime(toDatetimeLocal(currentStartTime));
    setEndTime(toDatetimeLocal(currentEndTime));
    setSelectedAmenities(new Set(currentAmenityIds));
    setContactName(currentContactName);
    setContactEmail(currentContactEmail);
    setAttendees(currentAttendees?.toString() ?? "");
    setPurpose(currentPurpose ?? "");
    setNotes(currentNotes ?? "");
    setError(null);
    setAvailStatus("idle");
    setOpen(true);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!startTime || !endTime) {
      setError("Both start and end times are required.");
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }

    if (!contactName.trim()) {
      setError("Contact name is required.");
      return;
    }
    if (!contactEmail.trim()) {
      setError("Contact email is required.");
      return;
    }

    if (availStatus === "conflict") {
      setError("This time slot conflicts with an existing booking. Please choose different dates.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          amenities: Array.from(selectedAmenities),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          attendees: attendees !== "" ? Number(attendees) : undefined,
          purpose: purpose.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update booking");
      }

      toast.success("Booking updated successfully");
      setOpen(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Button
        variant="outline"
        onClick={handleOpen}
        className="w-full gap-2 border-dashed"
      >
        <Pencil className="h-4 w-4" />
        Edit Booking
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Edit Booking
            </DialogTitle>
            <DialogDescription>
              Reschedule, update amenities, or edit customer contact details.
              Prices recalculate automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* ── Date & Time ──────────────────────────────────────────── */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Date &amp; Time</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start">Start</Label>
                  <input
                    id="edit-start"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-end">End</Label>
                  <input
                    id="edit-end"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {hours > 0 && (
                <p className="text-xs text-muted-foreground">
                  Duration: <span className="font-medium">{hours.toFixed(2)} hrs</span>
                </p>
              )}

              {/* Availability status pill */}
              {availStatus === "checking" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking availability…
                </div>
              )}
              {availStatus === "available" && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  This time slot is available
                </div>
              )}
              {availStatus === "conflict" && (
                <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  This time slot is already booked — please choose different dates
                </div>
              )}
            </div>

            <Separator />

            {/* ── Amenities ────────────────────────────────────────────── */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Amenities</h4>

              {availableAmenities.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No amenities available for this venue.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableAmenities.map((amenity) => (
                    <label
                      key={amenity._id}
                      htmlFor={`amenity-${amenity._id}`}
                      className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`amenity-${amenity._id}`}
                          checked={selectedAmenities.has(amenity._id)}
                          onCheckedChange={() => toggleAmenity(amenity._id)}
                        />
                        <span className="text-sm font-medium">{amenity.name}</span>
                      </div>
                      {amenity.surcharge > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          +${amenity.surcharge.toFixed(2)} SBD
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* ── Price Preview ─────────────────────────────────────────── */}
            <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-sm">
              <h4 className="font-semibold mb-3">Price Preview</h4>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Base ({hours.toFixed(2)} hrs × ${pricePerHour}/hr)
                </span>
                <span>${basePrice.toFixed(2)} SBD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amenities surcharge</span>
                <span>${amenitySurcharge.toFixed(2)} SBD</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-base">
                <span>New Total</span>
                <span>${totalPrice.toFixed(2)} SBD</span>
              </div>
            </div>

            <Separator />

            {/* ── Customer Info ─────────────────────────────────────────── */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Customer Info</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-name">Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="edit-contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Contact full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-contact-email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="edit-contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-attendees">Number of Attendees</Label>
                <Input
                  id="edit-attendees"
                  type="number"
                  min={1}
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-purpose">Purpose</Label>
                <Input
                  id="edit-purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Birthday party, Workshop"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes for the booking..."
                  className="min-h-20 resize-none"
                />
              </div>
            </div>

            {/* ── Error ─────────────────────────────────────────────────── */}
            {error && (
              <p className="text-sm text-destructive font-medium rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || availStatus === "conflict" || availStatus === "checking"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
