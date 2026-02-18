"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Trash2, MapPin, Loader2 } from "lucide-react";

// ───────────────────────────────────────────────
// Zod schema (matches Facility model)
// ───────────────────────────────────────────────
const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  location: z.string().min(3, "Location is required"),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "inactive", "maintenance", "closed"]),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  coverImage: z.any().optional(), // new File
  galleryImages: z.any().array().optional(), // new File[]
  managerIds: z.array(z.string()).min(1, "At least one manager required"),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FacilityEditFormProps {
  facility: {
    _id: string;
    name: string;
    location: string;
    description?: string;
    status: string;
    coordinates?: { lat: number; lng: number };
    coverImage?: string;
    galleryImages?: string[];
    managerIds: Array<{ _id: string; name: string; email: string }>;
    contactPhone?: string;
    contactEmail?: string;
  };
  possibleManagers: Array<{ _id: string; name: string; email: string }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FacilityEditForm({
  facility,
  possibleManagers,
  onSuccess,
  onCancel,
}: FacilityEditFormProps) {
  const [coverPreview, setCoverPreview] = useState<string | null>(facility.coverImage || null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>(
    facility.galleryImages?.filter(Boolean) || []
  );
  const [deletedImages, setDeletedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

    const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: facility.name || "",
      location: facility.location || "",
      description: facility.description || "",
      status: (facility.status as "active" | "inactive" | "maintenance" | "closed") || "active",
      lat: facility.coordinates?.lat ?? undefined,
      lng: facility.coordinates?.lng ?? undefined,
      coverImage: undefined,
      galleryImages: [],
      managerIds: facility.managerIds?.map(m => m._id) || [],
      contactPhone: facility.contactPhone || "",
      contactEmail: facility.contactEmail || "",
    },
    mode: "onChange",
  });

  const isSubmitting = form.formState.isSubmitting;

  // Get current location
  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue("lat", pos.coords.latitude);
        form.setValue("lng", pos.coords.longitude);
        toast.success("Location set");
        setGettingLocation(false);
      },
      (err) => {
        toast.error("Failed to get location", { description: err.message });
        setGettingLocation(false);
      }
    );
  };

  // Cover image change
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverPreview(URL.createObjectURL(file));
      form.setValue("coverImage", file);
    }
  };

  // Gallery images change
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setGalleryPreviews(prev => [...prev, ...newPreviews]);

    const current = form.getValues("galleryImages") || [];
    form.setValue("galleryImages", [...current, ...files]);
  };

  // Remove image (cover or gallery)
  const removeImage = (index: number, isCover = false) => {
    if (isCover) {
      setCoverPreview(null);
      if (facility.coverImage) {
        form.setValue("coverImage", undefined);
        setDeletedImages(prev => [...prev, facility.coverImage!]);
      }
    } else {
      const removedSrc = galleryPreviews[index];
      setGalleryPreviews(prev => prev.filter((_, i) => i !== index));

      if (index < (facility.galleryImages?.length || 0)) {
        setDeletedImages(prev => [...prev, removedSrc]);
      } else {
        const current = form.getValues("galleryImages") || [];
        form.setValue("galleryImages", current.filter((_, i) => i !== index - (facility.galleryImages?.length || 0)));
      }
    }
  };

  async function onSubmit(values: FormValues) {
    setUploading(true);

    const formData = new FormData();

    formData.append("name", values.name);
    formData.append("location", values.location);
    if (values.description) formData.append("description", values.description);
    formData.append("status", values.status);
    if (values.lat !== undefined && values.lng !== undefined) {
      formData.append("coordinates", JSON.stringify({ lat: values.lat, lng: values.lng }));
    }
    formData.append("contactPhone", values.contactPhone || "");
    formData.append("contactEmail", values.contactEmail || "");

    values.managerIds.forEach(id => formData.append("managerIds", id));

    // Deleted images (for backend to remove from disk)
    formData.append("deletedImages", JSON.stringify(deletedImages));

    // New cover image
    if (values.coverImage instanceof File) {
      formData.append("coverImage", values.coverImage);
    }

    // New gallery images
    if (values.galleryImages && values.galleryImages.length > 0) {
      values.galleryImages.forEach((file: File) => {
        formData.append("galleryImages", file);
      });
    }

    try {
      const res = await fetch(`/api/facilities/${facility._id}`, {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update facility");
      }

      toast.success("Facility updated successfully");
      onSuccess?.();
    } catch (err: any) {
      toast.error("Update failed", { description: err.message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facility Name *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isSubmitting}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coordinates */}
            <div className="space-y-4">
              <FormLabel>Coordinates (optional)</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="lat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lng"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={gettingLocation || isSubmitting}
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Use Current Location
                  </>
                )}
              </Button>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone (optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email (optional)</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Managers */}
            <FormField
              control={form.control}
              name="managerIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Managers *</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {possibleManagers.map(m => (
                        <div
                          key={m._id}
                          className={`px-3 py-1 rounded-full text-sm border cursor-pointer transition-colors ${field.value.includes(m._id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted hover:bg-muted/80"
                            }`}
                          onClick={() => {
                            const current = field.value || [];
                            field.onChange(
                              current.includes(m._id)
                                ? current.filter(id => id !== m._id)
                                : [...current, m._id]
                            );
                          }}
                        >
                          {m.name}
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Image */}
            <div className="space-y-4">
              <FormLabel>Cover Image</FormLabel>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                  id="cover-image-edit"
                  disabled={isSubmitting}
                />
                <label htmlFor="cover-image-edit" className="cursor-pointer">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">Update cover photo</p>
                </label>
              </div>

              {coverPreview && (
                <div className="relative inline-block">
                  <Image
                    src={coverPreview}
                    alt="Cover preview"
                    width={300}
                    height={200}
                    className="rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeImage(0, true)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Gallery Images */}
            <div className="space-y-4">
              <FormLabel>Gallery Images</FormLabel>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryChange}
                  className="hidden"
                  id="gallery-images-edit"
                  disabled={isSubmitting}
                />
                <label htmlFor="gallery-images-edit" className="cursor-pointer">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">Add more gallery photos</p>
                </label>
              </div>

              {galleryPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {galleryPreviews.map((src, idx) => (
                    <div key={idx} className="relative group">
                      <Image
                        src={src}
                        alt={`gallery ${idx + 1}`}
                        width={200}
                        height={150}
                        className="rounded-md object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                        onClick={() => removeImage(idx, false)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
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