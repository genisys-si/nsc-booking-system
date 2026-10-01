"use client";
import type { CSSProperties } from "react";
import { BookingHeader } from "@/components/booking/BookingHeader";
import { BookingWizard } from "@/components/booking/BookingWizard";

// Use the NSC brand blue (matches BookingHeader) as the primary colour on the public booking page
const brandTheme = {
  "--primary": "#005ba4",
  "--primary-foreground": "#ffffff",
  "--ring": "#005ba4",
} as CSSProperties;

export default function PublicBookingPage() {
  return (
    <div className="min-h-screen bg-background" style={brandTheme}>
      <BookingHeader />
      <main className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Book a venue</h1>
          <p className="mt-2 text-muted-foreground md:text-lg">
            Reserve a space at National Sports Council facilities in a few quick steps.
          </p>
        </div>

        <BookingWizard />
      </main>
    </div>
  );
}
