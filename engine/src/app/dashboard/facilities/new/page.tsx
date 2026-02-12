"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FacilityAddForm } from "@/components/facility/FacilityAddForm";

const formSchema = z.object({
  name: z.string().min(3, "Facility name must be at least 3 characters"),
  location: z.string().min(3, "Location is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewFacilityPage() {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: "",
      description: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create facility");
      }

      toast.success("Facility created successfully");
      router.push("/dashboard/facilities");
      router.refresh();
    } catch (err: any) {
      toast.error("Creation failed", { description: err.message });
    }
  }

  return (
    <div className="container max-w-7xl mx-auto py-10">
        <div className="text-3xl font-bold py-4">Create New Facility</div>
        <FacilityAddForm/>

    </div>
  );
}