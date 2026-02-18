import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import User from "@/models/User";
import { notFound, redirect } from "next/navigation";
import { FacilityEditForm } from "@/components/facility/FacilityEditForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditFacilityPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await paramsPromise;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  await dbConnect();

  const facilityRaw = await Facility.findById(params.id)
    .populate("managerIds", "name email")
    .lean();

  if (!facilityRaw) notFound();

  // Authorization: admin or one of the managers
  const isAuthorized =
    session.user.role === "admin" ||
    facilityRaw.managerIds?.some((m: any) => m._id.toString() === session.user.id);

  if (!isAuthorized) {
    return <div className="p-8 text-center text-destructive">Access denied</div>;
  }

  // Convert facility to plain object (critical for client component)
  const facility = {
    _id: facilityRaw._id.toString(),
    name: facilityRaw.name || "",
    description: facilityRaw.description || "",
    contactPhone: facilityRaw.contactPhone || "",
    contactEmail: facilityRaw.contactEmail || "",
    status: facilityRaw.status || "active",

    // Use facility name as location if no address field exists
    location: facilityRaw.location || "",

    // Coordinates: handle both object format and GeoJSON format
    coordinates: facilityRaw.coordinates
      ? {
        lat: facilityRaw.coordinates.lat,
        lng: facilityRaw.coordinates.lng,
      }
      : undefined,

    coverImage: facilityRaw.coverImage || null,
    galleryImages: facilityRaw.galleryImages || [],

    // Managers: plain objects
    managerIds: facilityRaw.managerIds?.map((m: any) => ({
      _id: m._id.toString(),
      name: m.name || "",
      email: m.email || "",
    })) || [],
  };

  console.log("Facility coordinates:", facilityRaw);

  // Fetch possible managers (plain objects)
  const allUsers = await User.find({})
    .select("_id name email")
    .lean();

  const possibleManagers = allUsers.map((u: any) => ({
    _id: u._id.toString(),
    name: u.name || "",
    email: u.email || "",
  }));

  return (
    <div className="container max-w-4xl py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Edit Facility: {facility.name}</h1>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/facilities/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Facility
          </Link>
        </Button>
      </div>

      {/* Pass only plain objects */}
      <FacilityEditForm
        facility={facility}
        possibleManagers={possibleManagers}
      />
    </div>
  );
}