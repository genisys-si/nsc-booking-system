// src/app/dashboard/users/[id]/edit/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { notFound, redirect } from "next/navigation";
import { UserEditForm } from "@/components/user/UserEditForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditUserPage({ params:paramsPromise }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params =  await paramsPromise;
  await dbConnect();

  const user = await User.findById(params.id)
    .select("name email phone role isActive")
    .lean();

  if (!user) {
    notFound();
  }

  const plainUser = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    isActive: user.isActive,
  };

  return (
    <div className="container max-w-3xl py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Edit User: {plainUser.name}</h1>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/users/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to User Details
          </Link>
        </Button>
      </div>

      <UserEditForm user={plainUser} />
    </div>
  );
}