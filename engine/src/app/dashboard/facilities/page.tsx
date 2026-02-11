// src/app/dashboard/facilities/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { DataTable } from "@/components/dashboard/DataTable";
import { columns } from "@/components/dashboard/facility-columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function FacilitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  await dbConnect();

  let filter: any = {};

  if (session.user.role === "manager") {
    filter.managerIds = session.user.id;
  }
  // admin sees all → no filter

  const facilities = await Facility.find(filter)
    .select("name location venues managerIds")
    .lean();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Facilities</h1>

        {session.user.role === "admin" && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Facility
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={facilities} />
    </div>
  );
}