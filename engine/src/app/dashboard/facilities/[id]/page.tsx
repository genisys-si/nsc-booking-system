// src/app/dashboard/facilities/[id]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Building2, MapPin, Edit, Trash2, Phone, Mail, Users, ImageIcon, Info, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MapViewer from "@/components/MapViewer";

export default async function FacilityDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  await dbConnect();

  const facilityRaw = await Facility.findById(params.id)
    .populate("managerIds", "name email role") // get role too if you have it
    .lean();

  if (!facilityRaw) notFound();

  // Convert to plain object + safe IDs
  const facility = {
    ...facilityRaw,
    _id: facilityRaw._id.toString(),
    managerIds: facilityRaw.managerIds.map((m: any) => ({
      _id: m._id.toString(),
      name: m.name,
      email: m.email,
      role: m.role || "manager", // fallback if no role field
    })),
    venues: (facilityRaw.venues || []).map((v: any) => ({
      ...v,
      _id: v._id.toString(),
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
      <div className="flex items-center justify-between flex-wrap gap-4">
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

      {/* Main Grid: Info + Cover */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Facility Information</CardTitle>
            <CardDescription>Complete details about this facility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Badge */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${facility.status === "active" ? "bg-green-100 text-green-800" :
                  facility.status === "inactive" ? "bg-yellow-100 text-yellow-800" :
                    facility.status === "maintenance" ? "bg-orange-100 text-orange-800" :
                      "bg-red-100 text-red-800"
                }`}>
                {facility.status.charAt(0).toUpperCase() + facility.status.slice(1)}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{facility.location}</p>
              </div>
            </div>

            {/* Description */}
            {facility.description && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="whitespace-pre-wrap">{facility.description}</p>
              </div>
            )}

            {/* Coordinates */}
            {facility.coordinates && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Coordinates</p>
                <p className="font-medium">
                  Lat: {facility.coordinates.lat.toFixed(6)}, Lng: {facility.coordinates.lng.toFixed(6)}
                </p>
              </div>
            )}

            {/* Contact Info */}
            {(facility.contactPhone || facility.contactEmail) && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Contact Information</p>
                {facility.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p>{facility.contactPhone}</p>
                  </div>
                )}
                {facility.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p>{facility.contactEmail}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Cover Image */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Cover Image</CardTitle>
          </CardHeader>
          <CardContent>
            {facility.coverImage ? (
              <div className="rounded-lg overflow-hidden shadow-sm">
                <Image
                  src={facility.coverImage}
                  alt={facility.name}
                  width={600}
                  height={400}
                  className="object-cover w-full h-64"
                />
              </div>
            ) : (
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">No cover image</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Interactive Map */}
      {facility.coordinates ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Facility Location
            </CardTitle>
            <CardDescription>
              Latitude: {facility.coordinates.lat.toFixed(6)} | Longitude: {facility.coordinates.lng.toFixed(6)}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-100 w-full">
              <MapViewer
                lat={facility.coordinates.lat}
                lng={facility.coordinates.lng}
                name={facility.name}

              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              No Location Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This facility does not have latitude/longitude coordinates set.
            </p>
          </CardContent>
        </Card>
      )}
      {/* Managers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Managers ({facility.managerIds.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {facility.managerIds.length === 0 ? (
            <p className="text-muted-foreground italic">No managers assigned yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {facility.managerIds.map((m: any) => (
                <div key={m._id} className="border rounded-lg p-4 bg-muted/40">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-muted-foreground">{m.email}</p>
                  <p className="text-xs mt-1 capitalize">Role: {m.role || "Manager"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gallery Images */}
      {facility.galleryImages?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Gallery Images ({facility.galleryImages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {facility.galleryImages.map((img: string, idx: number) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden shadow-sm">
                  <Image
                    src={img}
                    alt={`Gallery image ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Venues */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Venues ({facility.venues?.length || 0})
          </CardTitle>
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
              No venues yet. Click "Add Venue" above to create one.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {facility.venues.map((venue: any) => (
                <Card key={venue._id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>{venue.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>Capacity: {venue.capacity ?? "—"}</p>
                    <p>Price/hour: ${venue.pricePerHour?.toFixed(2) ?? "0.00"}</p>
                    <p>Bookable: {venue.isBookable ? "Yes" : "No"}</p>
                    <p>Amenities: {venue.amenities?.length ?? 0}</p>
                    {venue.images?.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {venue.images.length} image{venue.images.length !== 1 ? "s" : ""}
                      </p>
                    )}
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