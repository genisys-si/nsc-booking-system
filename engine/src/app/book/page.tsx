// src/app/book/page.tsx
import { BookingWizard } from "@/components/booking/BookingWizard";

export default function PublicBookingPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Book a Venue
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Reserve your space at the National Sports Council facilities. 
          Choose a venue, date, and extras — we'll handle the rest.
        </p>
      </div>

      <BookingWizard />
    </div>
  );
}