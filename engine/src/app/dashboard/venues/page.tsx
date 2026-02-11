// src/app/dashboard/venues/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { DataTable } from "@/components/dashboard/DataTable";
import { columns } from "@/components/dashboard/venue-columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function VenuesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  await dbConnect();

  let facilitiesFilter: any = {};

  if (session.user.role === "manager") {
    facilitiesFilter.managerIds = session.user.id;
  }

  // Flatten venues from matching facilities
  const facilities = await Facility.find(facilitiesFilter)
    .select("name venues")
    .lean();

  const venues = facilities.flatMap(facility =>
    facility.venues.map(venue => ({
      _id: venue._id.toString(),
      facilityName: facility.name,
      name: venue.name,
      capacity: venue.capacity,
      isBookable: venue.isBookable,
      amenitiesCount: venue.amenities?.length || 0,
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Venues</h1>

        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Venue
        </Button>
      </div>

      <DataTable columns={columns} data={venues} />
    </div>
  );
}