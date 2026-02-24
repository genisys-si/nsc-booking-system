import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Settings from "@/models/Settings";
import SettingsForm from "@/components/dashboard/SettingsForm";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') return <div>Unauthorized</div>;
  await dbConnect();
  const settingsData = await Settings.findOne().lean();
  const s = settingsData ? JSON.parse(JSON.stringify(settingsData)) : null;

  return (
    <div className="w-full min-h-screen py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <SettingsForm initial={s} />
      </div>
    </div>
  );
}
