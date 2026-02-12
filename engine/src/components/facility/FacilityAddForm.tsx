// src/components/facility/FacilityAddForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
// Zod schema — matches your model
// ───────────────────────────────────────────────
const formSchema = z.object({
  name: z.string().min(3, "Facility name must be at least 3 characters"),
  location: z.string().min(3, "Location is required"),
  description: z.string().max(1000, "Description too long").optional(),
  status: z.enum(["active", "inactive", "maintenance", "closed"]).default("active"),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  coverImage: z.any().optional(),           // File | undefined
  galleryImages: z.any().array().optional(), // File[]
  managerIds: z.array(z.string()).min(1, "At least one manager is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface FacilityAddFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialManagers?: { _id: string; name: string }[]; // preloaded list of possible managers
}

export function FacilityAddForm({
  onSuccess,
  onCancel,
  initialManagers = [],
}: FacilityAddFormProps) {
  const router = useRouter();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      location: "",
      description: "",
      status: "active",
      lat: 0,
      lng: 0,
      coverImage: undefined,
      galleryImages: [],
      managerIds: initialManagers.length > 0 ? [initialManagers[0]._id] : [],
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  // ───────────────────────────────────────────────
  // Get current location
  // ───────────────────────────────────────────────
  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue("lat", pos.coords.latitude);
        form.setValue("lng", pos.coords.longitude);
        toast.success("Current location loaded");
        setGettingLocation(false);
      },
      (err) => {
        toast.error("Could not get location", { description: err.message });
        setGettingLocation(false);
      }
    );
  };

  // ───────────────────────────────────────────────
  // Cover image preview & set
  // ───────────────────────────────────────────────
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverPreview(URL.createObjectURL(file));
      form.setValue("coverImage", file);
    }
  };

  // ───────────────────────────────────────────────
  // Gallery images preview & append
  // ───────────────────────────────────────────────
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setGalleryPreviews((prev) => [...prev, ...newPreviews]);

    const current = form.getValues("galleryImages") || [];
    form.setValue("galleryImages", [...current, ...files]);
  };

  // ───────────────────────────────────────────────
  // Submit handler – sends FormData
  // ───────────────────────────────────────────────
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

    values.managerIds.forEach((id) => formData.append("managerIds[]", id));

    // Cover image
    if (values.coverImage instanceof File) {
      formData.append("coverImage", values.coverImage);
    }

    // Gallery images
    if (values.galleryImages && values.galleryImages.length > 0) {
      values.galleryImages.forEach((file: File) => {
        formData.append("galleryImages", file);
      });
    }

    try {
      const res = await fetch("/api/facilities", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create facility");
      }

      toast.success("Facility created successfully");
      onSuccess?.();
      router.push("/dashboard/facilities");
      router.refresh();
    } catch (err: any) {
      toast.error("Failed to create facility", {
        description: err.message || "Please check your connection",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="mx-8">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* ─── Basic Info ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facility Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="National Stadium" {...field} />
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
                    <FormLabel>Location / City *</FormLabel>
                    <FormControl>
                      <Input placeholder="Honiara" {...field} />
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
                  <FormLabel>Current Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Under Maintenance</SelectItem>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
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
                        <Input type="number" step="any" {...field} />
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
                    Fetching location...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Use my current location
                  </>
                )}
              </Button>
            </div>

            {/* Cover Image */}
            <FormItem>
              <FormLabel>Cover Image (recommended)</FormLabel>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                  id="cover-image"
                  disabled={isSubmitting}
                />
                <label htmlFor="cover-image" className="cursor-pointer block">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">Click or drag to upload cover photo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, max 5 MB
                  </p>
                </label>
              </div>

              {coverPreview && (
                <div className="mt-4 relative inline-block">
                  <Image
                    src={coverPreview}
                    alt="Cover preview"
                    width={320}
                    height={180}
                    className="rounded-md object-cover shadow-sm"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2"
                    onClick={() => {
                      setCoverPreview(null);
                      form.setValue("coverImage", undefined);
                    }}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </FormItem>

            {/* Gallery Images */}
            <FormItem>
              <FormLabel>Additional Gallery Photos</FormLabel>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryChange}
                  className="hidden"
                  id="gallery-images"
                  disabled={isSubmitting}
                />
                <label htmlFor="gallery-images" className="cursor-pointer block">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">Add more photos</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can upload multiple images
                  </p>
                </label>
              </div>

              {galleryPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
                  {galleryPreviews.map((src, idx) => (
                    <div key={idx} className="relative group rounded-md overflow-hidden shadow-sm">
                      <Image
                        src={src}
                        alt={`Gallery preview ${idx + 1}`}
                        width={200}
                        height={200}
                        className="object-cover aspect-square"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setGalleryPreviews((prev) => prev.filter((_, i) => i !== idx));
                          const current = form.getValues("galleryImages") || [];
                          form.setValue("galleryImages", current.filter((_, i) => i !== idx));
                        }}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </FormItem>

            {/* Manager Assignment */}
            <FormField
              control={form.control}
              name="managerIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility Managers *</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {initialManagers.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No other users available yet. You will be the manager.
                        </p>
                      ) : (
                        initialManagers.map((manager) => (
                          <div
                            key={manager._id}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-all ${
                              field.value.includes(manager._id)
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-muted hover:bg-muted/80 border-border"
                            }`}
                            onClick={() => {
                              const current = field.value || [];
                              if (current.includes(manager._id)) {
                                field.onChange(current.filter((id) => id !== manager._id));
                              } else {
                                field.onChange([...current, manager._id]);
                              }
                            }}
                          >
                            {manager.name}
                          </div>
                        ))
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Click to select / deselect managers for this facility
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-8 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || uploading}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || uploading}
              >
                {isSubmitting || uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Facility"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}