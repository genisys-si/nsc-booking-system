import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2, MapPin, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function FacilityDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  await dbConnect();

  const facilityRaw = await Facility.findById(params.id)
    .populate("managerIds", "name email")
    .lean();

  if (!facilityRaw) notFound();

  const facility = {
    ...facilityRaw,
    _id: facilityRaw._id.toString(),
    managerIds: facilityRaw.managerIds.map((m: any) => ({
      _id: m._id.toString(),
      name: m.name,
      email: m.email,
    })),
  };

  // Authorization
  const isAuthorized = session.user.role === "admin" ||
    facility.managerIds.some((m: any) => m._id === session.user.id);

  if (!isAuthorized) {
    return <div className="p-8 text-center text-destructive">Access denied</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/facilities">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{facility.name}</h1>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/facilities/${params.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Facility
            </Link>
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <p>{facility.location}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{facility.status}</p>
            </div>
            {facility.coordinates && (
              <div>
                <p className="text-sm text-muted-foreground">Coordinates</p>
                <p className="font-medium">
                  Lat: {facility.coordinates.lat.toFixed(6)}, Lng: {facility.coordinates.lng.toFixed(6)}
                </p>
              </div>
            )}
            {facility.contactPhone && (
              <div>
                <p className="text-sm text-muted-foreground">Contact Phone</p>
                <p>{facility.contactPhone}</p>
              </div>
            )}
            {facility.contactEmail && (
              <div>
                <p className="text-sm text-muted-foreground">Contact Email</p>
                <p>{facility.contactEmail}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {facility.coverImage && (
          <div className="rounded-lg overflow-hidden shadow-sm">
            <Image
              src={facility.coverImage}
              alt={facility.name}
              width={600}
              height={400}
              className="object-cover w-full h-64"
            />
          </div>
        )}
      </div>

      {/* Managers */}
      <Card>
        <CardHeader>
          <CardTitle>Managers ({facility.managerIds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {facility.managerIds.map((m: any) => (
              <div key={m._id} className="px-3 py-1 bg-muted rounded-full text-sm">
                {m.name} ({m.email})
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Venues */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Venues ({facility.venues?.length || 0})</CardTitle>
          <Button asChild>
            <Link href={`/dashboard/facilities/${params.id}/venues/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Venue
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {facility.venues?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No venues yet. Add one above.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {facility.venues.map((venue: any) => (
                <Card key={venue._id.toString()}>
                  <CardHeader>
                    <CardTitle>{venue.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>Capacity: {venue.capacity ?? "—"}</p>
                    <p>Price/hour: ${venue.pricePerHour?.toFixed(2) ?? "0.00"}</p>
                    <p>Bookable: {venue.isBookable ? "Yes" : "No"}</p>
                    <p>Amenities: {venue.amenities?.length ?? 0}</p>
                    <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                      <Link href={`/dashboard/facilities/${params.id}/venues/${venue._id}/edit`}>
                        Edit Venue
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}