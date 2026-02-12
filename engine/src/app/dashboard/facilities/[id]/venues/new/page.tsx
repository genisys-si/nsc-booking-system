"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VenueAddForm } from "@/components/venue/VenueAddForm";

export default function NewVenuePage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const handleSuccess = () => {
    toast.success("Venue created successfully");
    router.push(`/dashboard/facilities/${params.id}`);
    router.refresh();
  };

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-8">Add New Venue</h1>

      <VenueAddForm
        facilityId={params.id}
        onSuccess={handleSuccess}
        onCancel={() => router.back()}
      />
    </div>
  );
}