// src/app/dashboard/facilities/[id]/venues/[venueId]/edit/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { notFound, redirect } from "next/navigation";
import { VenueEditForm } from "@/components/venue/VenueEditForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditVenuePage({
    params: paramsPromise,
}: {
    params: Promise<{ id: string; venueId: string }>;
}) {
    const params = await paramsPromise;

    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/auth/signin");

    await dbConnect();

    const facilityRaw = await Facility.findById(params.id).lean();

    if (!facilityRaw) notFound();

    // Convert facility to plain object
    const facility = {
        ...facilityRaw,
        _id: facilityRaw._id.toString(),
        venues: facilityRaw.venues.map((v: any) => ({
            ...v,
            _id: v._id.toString(),
        })),
    };


    const venueRaw = facility.venues.find(
        (v: any) => v._id === params.venueId
    );

    if (!venueRaw) notFound();

    const venue = {
        _id: venueRaw._id.toString(),
        name: venueRaw.name,
        capacity: venueRaw.capacity,
        pricePerHour: venueRaw.pricePerHour,
        isBookable: venueRaw.isBookable,
        amenities: (venueRaw.amenities || []).map((amenity: any) => ({
            name: amenity.name,
            description: amenity.description,
            surcharge: amenity.surcharge,
        })),
        images: venueRaw.images || [],
    };

    // Authorization check
    const isAuthorized =
        session.user.role === "admin" ||
        facility.managerIds?.some((id: any) => id.toString() === session.user.id);

    if (!isAuthorized) {
        return <div className="p-8 text-center text-destructive">Access denied</div>;
    }

    return (
        <div className="container max-w-4xl py-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Edit Venue</h1>
                    <p className="text-muted-foreground mt-1">
                        in {facility.name}
                    </p>
                </div>

                <Button variant="outline" asChild>
                    <Link href={`/dashboard/facilities/${params.id}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Facility
                    </Link>
                </Button>
            </div>
            <VenueEditForm
                venue={venue}           
                facilityId={params.id}
                
              
            />

        </div>
    );
}