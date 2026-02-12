// src/components/venue/VenueAddForm.tsx
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Upload } from "lucide-react";

const amenitySchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  surcharge: z.coerce.number().min(0),
});

const formSchema = z.object({
  name: z.string().min(1, "Required"),
  capacity: z.coerce.number().min(1).optional(),
  pricePerHour: z.coerce.number().min(0),
  isBookable: z.boolean().default(false),
  amenities: z.array(amenitySchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface VenueAddFormProps {
  facilityId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<FormValues>; // for edit mode
}

export function VenueAddForm({
  facilityId,
  onSuccess,
  onCancel,
  initialData = {},
}: VenueAddFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      capacity: undefined,
      pricePerHour: 0,
      isBookable: false,
      amenities: [],
      ...initialData,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "amenities",
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          facilityId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      toast.success("Venue created");
      onSuccess?.();
    } catch (err: any) {
      toast.error("Failed", { description: err.message });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* name, capacity, pricePerHour, isBookable – same as before */}

        {/* Amenities field array – same as before */}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {form.formState.isSubmitting ? "Saving..." : "Create Venue"}
          </Button>
        </div>
      </form>
    </Form>
  );
}