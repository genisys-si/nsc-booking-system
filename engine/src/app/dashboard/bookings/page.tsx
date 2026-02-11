import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Facility from "@/models/Facility";
import { DataTable } from "@/components/dashboard/DataTable"; 
import { columns } from "@/components/dashboard/booking-columns";

export default async function BookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  await dbConnect();

  let filter: any = { status: { $ne: "cancelled" } }; // example

  if (session.user.role === "manager") {
    const facility = await Facility.findOne({ managerIds: session.user.id });
    if (facility) {
      filter.facilityId = facility._id;
    } else {
      return <div>No facility assigned.</div>;
    }
  }
  // admin → sees all

  const bookings = await Booking.find(filter)
    .populate("userId", "name email")
    .populate("facilityId", "name")
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Venue Bookings</h1>

      <DataTable columns={columns} data={bookings} />
    </div>
  );
}