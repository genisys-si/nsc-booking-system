"use client";

import { useState } from "react";
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
import { Trash2, Plus } from "lucide-react";

// ───────────────────────────────────────────────
// Zod schema for form validation
// ───────────────────────────────────────────────
const amenitySchema = z.object({
  name: z.string().min(1, "Amenity name is required"),
  description: z.string().optional(),
  surcharge: z.coerce.number().min(0, "Surcharge cannot be negative"),
});

const formSchema = z.object({
  name: z.string().min(1, "Venue name is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").optional(),
  pricePerHour: z.coerce.number().min(0, "Price cannot be negative"),
  isBookable: z.boolean(),
  amenities: z.array(amenitySchema).optional(),
  imagesToKeep: z.array(z.string()).optional(),
imagesToDelete: z.array(z.string()).optional(),
});

type VenueFormValues = z.infer<typeof formSchema>;

interface VenueEditFormProps {
  venue: {
    _id: string;
    name: string;
    capacity?: number;
    pricePerHour: number;
    isBookable: boolean;
    amenities: Array<{ name: string; description?: string; surcharge: number }>;
  };
  facilityId: string; // needed for update API
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VenueEditForm({
  venue,
  facilityId,
  onSuccess,
  onCancel,
}: VenueEditFormProps) {
  const form = useForm<VenueFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: venue.name,
      capacity: venue.capacity,
      pricePerHour: venue.pricePerHour || 0,
      isBookable: venue.isBookable,
      amenities: venue.amenities || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "amenities",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(values: VenueFormValues) {
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/venues/${venue._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          facilityId, // to verify ownership
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update venue");
      }

      toast.success("Venue updated successfully");
      onSuccess?.();
    } catch (error: any) {
      toast.error("Update failed", {
        description: error.message || "Something went wrong",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity (people)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="pricePerHour"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price per Hour (SBD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isBookable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Bookable</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Allow public users to book this venue
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Amenities Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Amenities</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "", description: "", surcharge: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Amenity
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No amenities added yet
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`amenities.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`amenities.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (optional)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`amenities.${index}.surcharge`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Surcharge (SBD)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}