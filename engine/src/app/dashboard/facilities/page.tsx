// src/app/dashboard/facilities/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Building2 } from "lucide-react";
import Image from "next/image";

export default async function FacilitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  await dbConnect();

  const query = session.user.role === "admin"
    ? {}
    : { managerIds: session.user.id };

  const facilities = await Facility.find(query)
    .select("name location venues managerIds coverImage") // ← added coverImage
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
            <Card 
              key={fac._id.toString()} 
              className="hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Cover Image at the top */}
              {fac.coverImage ? (
                <div className="relative h-48 w-full overflow-hidden bg-muted">
                  <Image
                    src={fac.coverImage}
                    alt={fac.name}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={false}
                  />
                </div>
              ) : (
                <div className="h-48 w-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <Building2 className="h-16 w-16 text-muted-foreground/50" />
                </div>
              )}

              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  {fac.name}
                </CardTitle>
                <CardDescription className="line-clamp-1">
                  {fac.location}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Venues:</span>
                    <span className="font-medium">{fac.venues?.length || 0}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Managers:</span>
                    <span className="font-medium">{fac.managerIds?.length || 1}</span>
                  </p>
                </div>

                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href={`/dashboard/facilities/${fac._id}`}>
                    Manage Facility →
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