import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { redirect } from "next/navigation";
import BookingCreateForm from "@/components/booking/BookingCreateForm";

export default async function NewBookingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  await dbConnect();

  const facilitiesRaw = await Facility.find({})
    .select("name venues")
    .lean();

  // Convert ObjectId to string for client safety
  const facilities = facilitiesRaw.map(f => ({
    _id: f._id.toString(),
    name: f.name,
    venues: f.venues.map((v: any) => ({
      _id: v._id.toString(),
      name: v.name,
      pricePerHour: v.pricePerHour || 0,
      amenities: (v.amenities || []).map((a: any) => ({
        _id: a._id.toString(),
        name: a.name,
        surcharge: a.surcharge || 0,
      })),
    })),
  }));

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Create New Booking</h1>
      <BookingCreateForm facilities={facilities} />
    </div>
  );
}