import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Facility from "@/models/Facility";
import { DataTable } from "@/components/dashboard/DataTable";
import { columns } from "@/components/dashboard/booking-columns";
import BookingFilters from "@/components/dashboard/BookingFilters";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function BookingsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  await dbConnect();

  const searchParams = await searchParamsPromise;

  let filter: any = { status: { $ne: "cancelled" } };

  if (session.user.role === "manager") {
    const facility = await Facility.findOne({ managerIds: session.user.id });
    if (facility) {
      filter.facilityId = facility._id;
    } else {
      return <div>No facility assigned.</div>;
    }
  }

  if (searchParams.status) filter.status = searchParams.status;
  if (searchParams.venueId) filter.venueId = searchParams.venueId;
  if (searchParams.startDate) {
    filter.startTime = { $gte: new Date(searchParams.startDate as string) };
  }
  if (searchParams.endDate) {
    filter.endTime = { $lte: new Date(searchParams.endDate as string) };
  }

  const bookingsRaw = await Booking.find(filter)
    .populate("userId", "name email")
    .populate("facilityId", "name venues")
    .sort({ createdAt: -1 })
    .lean();

  

  const bookings = bookingsRaw.map(b => ({
    _id: b._id.toString(),
    userId: b.userId ? { name: b.userId.name, email: b.userId.email } : null,
    facilityId: b.facilityId ? { name: b.facilityId.name } : null,
    venueId: b.venueId.toString(),
    venueName: b.facilityId?.venues?.find(
      (v: any) => v._id.toString() === b.venueId.toString()
    )?.name || "—",
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    status: b.status,
    purpose: b.purpose,
    attendees: b.attendees,
    contactName: b.contactName,
    contactEmail: b.contactEmail,
    notes: b.notes,
    amenities: b.amenities?.map((a: any) => a.toString()) || [],
    basePrice: b.basePrice,
    amenitySurcharge: b.amenitySurcharge,
    totalPrice: b.totalPrice,
    invoiceId: b.invoiceId,
    createdAt: b.createdAt.toISOString(),
  }));

  console.log(bookings);

  const venueFilterRaw = await Facility.aggregate([
    { $match: session.user.role === "manager" ? { managerIds: session.user.id } : {} },
    { $unwind: "$venues" },
    {
      $project: {
        _id: "$venues._id",
        name: "$venues.name",
        facilityName: "$name",
      },
    },
  ]);

  const venueOptions = venueFilterRaw.map(v => ({
    _id: v._id.toString(),
    name: v.name,
    facilityName: v.facilityName,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Venue Bookings</h1>
        <Button asChild>
          <Link href="/dashboard/bookings/new">
            <Plus className="mr-2 h-4 w-4" />
            Create New Booking
          </Link>
        </Button>
      </div>

      <BookingFilters venueOptions={venueOptions} />

      {bookings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No bookings found matching the filters.
        </div>
      ) : (
        <DataTable columns={columns} data={bookings} />
      )}
    </div>
  );
}