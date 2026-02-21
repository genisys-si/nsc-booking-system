import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Facility from "@/models/Facility";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, User, Phone, Mail, FileText, History } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import BookingActions from "@/components/booking/BookingActions";
import BookingApprovalActions from "@/components/booking/BookingApprovalActions";
import BookingPaymentActions from "@/components/booking/BookingPaymentActions";


export default async function BookingDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return <div className="p-8 text-center">Please sign in to view booking details</div>;
  }

  await dbConnect();

  const params = await paramsPromise;

  const bookingRaw = await Booking.findById(params.id)
    .populate("userId", "name email")
    .lean();

  if (!bookingRaw) notFound();

  // Explicitly load the facility so we always have access to nested
  // `venues` and their `amenities` (populate on nested subdocs can be
  // unreliable). This guarantees venue name & amenities are available
  // for the booking details view.
  const facilityRaw = bookingRaw.facilityId
    ? await Facility.findById(bookingRaw.facilityId).lean()
    : null;
  if (!facilityRaw) {
    // If facility referenced by booking isn't found, treat as not found
    return notFound();
  }



  const booking = {
    ...bookingRaw,
    _id: bookingRaw._id.toString(),
    venueId: bookingRaw.venueId?.toString(),
    facilityId: facilityRaw,
    selectedAmenities: (bookingRaw.amenities || []).map((a: any) => a?.toString ? a.toString() : String(a)),
    startTime: bookingRaw.startTime.toISOString(),
    endTime: bookingRaw.endTime.toISOString(),
    createdAt: bookingRaw.createdAt.toISOString(),
    updatedAt: bookingRaw.updatedAt?.toISOString(),
    paymentDate: bookingRaw.paymentDate?.toISOString(),
    statusHistory: bookingRaw.statusHistory?.map((h: any) => ({
      status: h.status,
      changedBy: h.changedBy.toString(),
      changedAt: h.changedAt.toISOString(),
      reason: h.reason,
    })) || [],
  };

  const plainPayments = booking.payments?.map((p: any) => ({
  amount: p.amount,
  method: p.method,
  date: p.date.toISOString(), // or p.date.toString()
  notes: p.notes || "",
  recordedBy: p.recordedBy.toString(), // convert ObjectId to string
})) || [];


  // Extract venue name + selected amenities with prices
  let venueName = "—";
  let selectedAmenities: { name: string; surcharge: number }[] = [];
  let amenityTotal = booking.amenitySurcharge || 0;

  if (booking.facilityId) {
    const facility = booking.facilityId;
    const venue = facility.venues?.find((v: any) => v._id.toString() === booking.venueId);
    venueName = venue?.name || "—";



    // Match only the amenities actually selected for this booking
    if (booking.selectedAmenities?.length > 0 && venue?.amenities?.length > 0) {
      selectedAmenities = booking.selectedAmenities
        .map((amenId: string) => {
          const amenity = venue.amenities.find((a: any) => a._id.toString() === amenId);
          return amenity ? { name: amenity.name, surcharge: amenity.surcharge || 0 } : null;
        })
        .filter(Boolean) as { name: string; surcharge: number }[];
    }
  }

  const isAuthorized = session.user.role === "admin" || session.user.role === "manager";

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/bookings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Booking Details</h1>
        </div>

        <div className="flex gap-3">
          <Badge variant={
            booking.status === "confirmed" ? "default" :
              booking.status === "pending" ? "secondary" :
                "destructive"
          }>
            {booking.status.toUpperCase()}
          </Badge>

          <Badge variant={
            booking.paymentStatus === "paid" ? "default" :
              booking.paymentStatus === "pending" ? "secondary" :
                "destructive"
          }>
            Payment: {booking.paymentStatus?.toUpperCase() || "PENDING"}
          </Badge>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Booking Information</CardTitle>
            <CardDescription>
              Invoice #{booking.invoiceId || "—"} · Ref: {booking.bookingRef || "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Facility</p>
                <p className="font-medium">{booking.facilityId?.name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Venue</p>
                <p className="font-medium">{venueName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Start Time</p>
                <p className="font-medium">{format(new Date(booking.startTime), "PPP p")}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">End Time</p>
                <p className="font-medium">{format(new Date(booking.endTime), "PPP p")}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{format(new Date(booking.createdAt), "PPP p")}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{booking.updatedAt ? format(new Date(booking.updatedAt), "PPP p") : "—"}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Customer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{booking.contactName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{booking.contactEmail || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Attendees</p>
                  <p className="font-medium">{booking.attendees ?? "—"}</p>
                </div>
              </div>
            </div>

            {/* Selected Amenities & Charges Breakdown */}
            <div className="space-y-6">
              <h3 className="font-semibold">Selected Amenities & Charges</h3>

              {selectedAmenities.length > 0 ? (
                <div className="space-y-6">
                  {/* Amenities List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedAmenities.map((am, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-md bg-muted/50">
                        <span className="font-medium">{am.name}</span>
                        <span className="text-green-600 font-medium">+${am.surcharge.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Charges Breakdown */}
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Base Price (Venue Rate × Hours):</span>
                      <span>${booking.basePrice?.toFixed(2) || "0.00"} SBD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Amenities Surcharge:</span>
                      <span>${amenityTotal.toFixed(2)} SBD</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Grand Total:</span>
                      <span>${booking.totalPrice?.toFixed(2) || "0.00"} SBD</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                  <p className="font-medium">No amenities selected for this booking</p>
                  <p className="text-sm mt-2">
                    Base: ${booking.basePrice?.toFixed(2) || "0.00"} → Total: ${booking.totalPrice?.toFixed(2) || "0.00"} SBD
                  </p>
                </div>
              )}
            </div>

            {/* Purpose & Notes */}
            {(booking.purpose || booking.notes) && (
              <div className="space-y-4 pt-6 border-t">
                <h3 className="font-semibold">Additional Info</h3>
                {booking.purpose && (
                  <div>
                    <p className="text-sm text-muted-foreground">Purpose</p>
                    <p className="font-medium">{booking.purpose}</p>
                  </div>
                )}
                {booking.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{booking.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Payment & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center font-medium">
                <span>Total Amount:</span>
                <span>${booking.totalPrice?.toFixed(2) || "0.00"} SBD</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <Badge variant={
                  booking.paymentStatus === "paid" ? "default" :
                    booking.paymentStatus === "pending" ? "secondary" :
                      "destructive"
                }>
                  {booking.paymentStatus?.toUpperCase() || "PENDING"}
                </Badge>
              </div>

              {booking.paymentStatus === "paid" && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Paid Amount:</span>
                    <span>${booking.paidAmount?.toFixed(2) || "0.00"} SBD</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Method:</span>
                    <span className="capitalize">{booking.paymentMethod || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Paid On:</span>
                    <span>{booking.paymentDate ? format(new Date(booking.paymentDate), "PPP p") : "—"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge variant={
                  booking.status === "confirmed" ? "default" :
                    booking.status === "pending" ? "secondary" :
                      "destructive"
                } className="text-lg px-4 py-1">
                  {booking.status.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {isAuthorized && (
            <div className="space-y-4">

              <BookingApprovalActions
                bookingId={booking._id}
                currentStatus={booking.status}
                paymentStatus={booking.paymentStatus}
                isAuthorized={isAuthorized}
              />

              <BookingPaymentActions
                bookingId={booking._id}
                paymentStatus={booking.paymentStatus}
                totalPrice={booking.totalPrice}
                totalPaid={booking.totalPaid || 0}
                remainingBalance={booking.remainingBalance || booking.totalPrice}
                payments={plainPayments}
                isAuthorized={isAuthorized}
              />
            </div>

          )}

          {isAuthorized && (
            <BookingActions
              bookingId={booking._id}
              paymentStatus={booking.paymentStatus}
              isAuthorized={isAuthorized}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {booking.payments?.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No payments recorded yet</p>
          ) : (
            <div className="space-y-4">
              {booking.payments?.map((p: any, index: number) => (
                <div key={index} className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex justify-between">
                    <span className="font-medium">SBD {p.amount.toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(p.date), "PPP p")}
                    </span>
                  </div>
                  <p className="text-sm">Method: {p.method}</p>
                  {p.notes && <p className="text-sm">Notes: {p.notes}</p>}
                </div>
              ))}
              <div className="pt-4 border-t">
                <div className="flex justify-between font-medium">
                  <span>Total Paid:</span>
                  <span>SBD {booking.totalPaid?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Remaining:</span>
                  <span>SBD {booking.remainingBalance?.toFixed(2) || "0.00"}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Status History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {booking.statusHistory.length === 0 ? (
            <p className="text-muted-foreground italic text-center py-8">
              No status changes recorded yet
            </p>
          ) : (
            <div className="space-y-6">
              {booking.statusHistory.map((entry: any, index: number) => (
                <div key={index} className="relative pl-8 border-l-2 border-muted">
                  <div className="absolute -left-2 top-1.5 w-4 h-4 rounded-full bg-primary" />
                  <div className="flex items-center gap-3 mb-1">
                    <Badge variant={
                      entry.status === "confirmed" ? "default" :
                        entry.status === "pending" ? "secondary" :
                          "destructive"
                    }>
                      {entry.status.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.changedAt), "PPP p")}
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="text-sm text-muted-foreground">
                      Reason: {entry.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}