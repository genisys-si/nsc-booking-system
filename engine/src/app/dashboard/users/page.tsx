import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { redirect } from "next/navigation";
import { DataTable } from "@/components/dashboard/DataTable";
import { columns } from "@/components/dashboard/user-columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  await dbConnect();

  const users = await User.find({})
    .select("name email role isActive lastLogin createdAt")
    .sort({ createdAt: -1 })
    .lean()
    .then(docs => docs.map(user => ({
    ...user,
    _id: user._id.toString(),           // convert ObjectId → string
    createdAt: user.createdAt.toISOString(), // Date → ISO string
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
  })));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>

        <Button asChild>
          <Link href="/dashboard/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Create New User
          </Link>
        </Button>
      </div>

      <DataTable columns={columns} data={users} />
    </div>
  );
}