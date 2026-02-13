// src/components/venue/VenueEditForm.tsx
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Image from "next/image";

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

// ───────────────────────────────────────────────
// Zod schema
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
  isBookable: z.boolean().default(false),
  amenities: z.array(amenitySchema).optional(),
  images: z.any().array().optional(), // new File[]
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
    images: string[]; // existing image paths from DB
  };
  facilityId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VenueEditForm({
  venue,
  facilityId,
  onSuccess,
  onCancel,
}: VenueEditFormProps) {
  // Existing images from DB as initial previews
  const [imagePreviews, setImagePreviews] = useState<string[]>(
    venue.images
      .filter(img => img && typeof img === "string" && img.trim() !== "")
      .map(img => (img.startsWith("http") || img.startsWith("/") ? img : `/uploads/venues/${img}`))
  );

  // Track which existing images were deleted (to send to backend for disk deletion)
  const [deletedImages, setDeletedImages] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);

  const form = useForm<VenueFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: venue.name,
      capacity: venue.capacity,
      pricePerHour: venue.pricePerHour,
      isBookable: venue.isBookable,
      amenities: venue.amenities || [],
      images: [], // only NEW uploads go here
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "amenities",
  });

  const isSubmitting = form.formState.isSubmitting;

  // ───────────────────────────────────────────────
  // Handle new image uploads
  // ───────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPreviews: string[] = [];
    for (const file of files) {
      newPreviews.push(URL.createObjectURL(file));
    }

    setImagePreviews(prev => [...prev, ...newPreviews]);

    const current = form.getValues("images") || [];
    form.setValue("images", [...current, ...Array.from(files)]);
  };

  // ───────────────────────────────────────────────
  // Remove image (existing or new)
  // ───────────────────────────────────────────────
  const removeImage = (index: number) => {
    const removedSrc = imagePreviews[index];

    setImagePreviews(prev => prev.filter((_, i) => i !== index));

    // If it's an existing image (from DB)
    if (index < venue.images.length) {
      setDeletedImages(prev => [...prev, removedSrc]);
    } else {
      // New upload – remove from form value
      const currentNew = form.getValues("images") || [];
      const newIndex = index - venue.images.length;
      form.setValue("images", currentNew.filter((_, i) => i !== newIndex));
    }
  };

  // ───────────────────────────────────────────────
  // Submit – send new data + deleted images list
  // ───────────────────────────────────────────────
  async function onSubmit(values: VenueFormValues) {
    setUploading(true);

    const formData = new FormData();

    formData.append("facilityId", facilityId);
    formData.append("name", values.name);
    formData.append("pricePerHour", values.pricePerHour.toString());
    formData.append("isBookable", values.isBookable.toString());

    if (values.capacity !== undefined) {
      formData.append("capacity", values.capacity.toString());
    }

    // Amenities
    formData.append("amenities", JSON.stringify(values.amenities || []));

    // Deleted existing images (for backend to remove from disk)
    formData.append("deletedImages", JSON.stringify(deletedImages));

    // New images only
    if (values.images && values.images.length > 0) {
      values.images.forEach((file: File) => {
        formData.append("images", file);
      });
    }

    try {
      const res = await fetch(`/api/venues/${venue._id}`, {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update venue");
      }

      toast.success("Venue updated successfully");
      onSuccess?.();
    } catch (err: any) {
      toast.error("Update failed", {
        description: err.message || "Something went wrong",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name, Capacity, Price, Bookable – same as add form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
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
                    <FormLabel>Capacity (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={isSubmitting} />
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
                      <Input type="number" step="0.01" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isBookable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-8">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Bookable</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Allow public booking
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Amenities – same as add */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Amenities</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: "", description: "", surcharge: 0 })}
                  disabled={isSubmitting}
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
                                  <Input {...field} disabled={isSubmitting} />
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
                                  <Input {...field} disabled={isSubmitting} />
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
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    disabled={isSubmitting}
                                  />
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
                          disabled={isSubmitting}
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

            {/* Images Section */}
            <div className="space-y-4">
              <FormLabel>Venue Images</FormLabel>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="venue-images-edit"
                  disabled={isSubmitting}
                />
                <label htmlFor="venue-images-edit" className="cursor-pointer">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">Add more images</p>
                </label>
              </div>

              {imagePreviews.length > 0 ? (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="relative group">
                      <Image
                        src={src}
                        alt={`image ${idx + 1}`}
                        width={200}
                        height={150}
                        className="rounded-md object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-image.jpg"; // fallback
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                        onClick={() => removeImage(idx)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-4">
                  No images yet
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || uploading}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isSubmitting || uploading}>
                {isSubmitting || uploading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}