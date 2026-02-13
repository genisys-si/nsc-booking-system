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
  const isAuthorized = session.user.role === "admin" ||
    facilityRaw.managerIds.some((m: any) => m._id.toString() === session.user.id);

  if (!isAuthorized) {
    return <div className="p-8 text-center text-destructive">Access denied</div>;
  }

  // Prepare plain object for client component
  const facility = {
    _id: facilityRaw._id.toString(),
    name: facilityRaw.name,
    location: facilityRaw.location,
    description: facilityRaw.description || "",
    status: facilityRaw.status,
    coordinates: facilityRaw.coordinates || { lat: "", lng: "" },
    coverImage: facilityRaw.coverImage || "",
    galleryImages: facilityRaw.galleryImages || [],
    managerIds: facilityRaw.managerIds.map((m: any) => ({
      _id: m._id.toString(),
      name: m.name,
      email: m.email,
    })),
    contactPhone: facilityRaw.contactPhone || "",
    contactEmail: facilityRaw.contactEmail || "",
  };

  // Fetch all possible managers for selection (exclude current facility managers if needed)
  const allUsers = await User.find({})
    .select("_id name email")
    .lean();

  const possibleManagers = allUsers.map(u => ({
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
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

      <FacilityEditForm
        facility={facility}
        possibleManagers={possibleManagers}
        
      />
    </div>
  );
}