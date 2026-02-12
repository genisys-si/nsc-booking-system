// src/app/dashboard/users/[id]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserCog } from "lucide-react";
import Link from "next/link";


export default async function UserDetailPage({ params: paramsPromise }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params =  await paramsPromise;

  await dbConnect();

  const user = await User.findById(params.id)
    .select("name email phone role isActive lastLogin createdAt")
    .lean();

  if (!user) {
    notFound();
  }

  // Convert to plain object + string IDs/dates
  const plainUser = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };

  return (
    <div className="container max-w-4xl py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/users">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">User: {plainUser.name}</h1>
        </div>

        <Button variant="outline" asChild>
          <Link href={`/dashboard/users/${params.id}/edit`}>
            <UserCog className="mr-2 h-4 w-4" />
            Edit User
          </Link>
        </Button>
      </div>

      {/* User Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Details and account status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
              <p className="mt-1 text-lg">{plainUser.name}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
              <p className="mt-1 text-lg">{plainUser.email}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
              <p className="mt-1 text-lg">{plainUser.phone || "—"}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Role</h3>
              <p className="mt-1">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  plainUser.role === "admin" ? "bg-red-100 text-red-800" :
                  plainUser.role === "manager" ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {plainUser.role.charAt(0).toUpperCase() + plainUser.role.slice(1)}
                </span>
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <p className="mt-1">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  plainUser.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {plainUser.isActive ? "Active" : "Inactive"}
                </span>
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Last Login</h3>
              <p className="mt-1">{plainUser.lastLogin ? new Date(plainUser.lastLogin).toLocaleString() : "Never logged in"}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
              <p className="mt-1">{new Date(plainUser.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}