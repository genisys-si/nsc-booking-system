import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { notFound, redirect } from "next/navigation";
import { VenueAddForm } from "@/components/venue/VenueAddForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";


export default async function NewVenuePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = await paramsPromise;
   
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/auth/signin");

    await dbConnect();

    const facility = await Facility.findById(params.id).lean();
    if (!facility) notFound();

    // Authorization: must be manager or admin
    const isAuthorized = session.user.role === "admin" ||
        facility.managerIds.some((id: any) => id.toString() === session.user.id);

    if (!isAuthorized) {
        return <div className="p-8 text-center text-destructive">Access denied</div>;
    }

    return (
        <div className="container max-w-4xl py-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Add New Venue</h1>
                    <p className="text-muted-foreground mt-1">to {facility.name}</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href={`/dashboard/facilities/${params.id}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Facility
                    </Link>
                </Button>
            </div>


            <VenueAddForm
                facilityId={params.id}           // from URL params
                
            />
        </div>
    );
}