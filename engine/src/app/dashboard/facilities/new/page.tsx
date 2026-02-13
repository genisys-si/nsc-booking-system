import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { redirect } from "next/navigation";
import { FacilityAddForm } from "@/components/facility/FacilityAddForm";




export default async function NewFacilityPage() {

    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/auth/signin");

    await dbConnect();

    // Fetch all users for manager selection (admin sees all)
    const users = await User.find({})
        .select("_id name email")
        .lean();

    const initialManagers = users.map(u => ({
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
    }));



    return (
        <div className="container max-w-7xl mx-auto py-10">
            <div className="text-3xl font-bold py-4">Create New Facility</div>
            <FacilityAddForm initialManagers={initialManagers}/>

        </div>
    );
}