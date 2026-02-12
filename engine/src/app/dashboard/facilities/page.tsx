import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Building2 } from "lucide-react";

export default async function FacilitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  await dbConnect();

  const query = session.user.role === "admin"
    ? {}
    : { managerIds: session.user.id };

  const facilities = await Facility.find(query)
    .select("name location venues managerIds")
    .lean();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Facilities</h1>

        <Button asChild>
          <Link href="/dashboard/facilities/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Facility
          </Link>
        </Button>
      </div>

      {facilities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          You don't manage any facilities yet.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map(fac => (
            <Card key={fac._id.toString()} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {fac.name}
                </CardTitle>
                <CardDescription>{fac.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>Venues: {fac.venues?.length || 0}</p>
                  <p>Managers: {fac.managerIds?.length || 1}</p>
                </div>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href={`/dashboard/facilities/${fac._id}`}>
                    Manage Venues →
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}