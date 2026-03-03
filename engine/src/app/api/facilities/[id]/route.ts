import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";
import { uuidv4 } from "zod";
import { put, del } from "@vercel/blob"; // Import Blob functions



async function deleteImageFromBlob(url: string) {
  if (!url || !url.includes("public.blob.vercel-storage.com")) return;

  try {
    await del(url);
    console.log(`Deleted blob image: ${url}`);
  } catch (err) {
    console.warn(`Failed to delete blob image ${url}:`, err);
  }
}

/**
 * Uploads an image to Vercel Blob
 */
async function saveFacilityImageToBlob(file: File): Promise<string> {
  // Generate a clean filename
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const fileName = `facilities/${timestamp}-${cleanName}`;

  // put() handles the buffer conversion and storage automatically
  const blob = await put(fileName, file, {
    access: "public",
  });

  return blob.url; // Returns the full https:// URL
}

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const formData = await req.formData();

    // Basic fields
    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const description = formData.get("description") as string || undefined;
    const status = formData.get("status") as string;
    const coordinatesRaw = formData.get("coordinates") as string;
    const contactPhone = formData.get("contactPhone") as string || undefined;
    const contactEmail = formData.get("contactEmail") as string || undefined;

    const managerIdsRaw = formData.getAll("managerIds") as string[];
    const deletedImagesRaw = formData.get("deletedImages") as string;
    const deletedImages = deletedImagesRaw ? JSON.parse(deletedImagesRaw) : [];

    if (!name || !location || !status) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const facility = await Facility.findById(params.id);
    if (!facility) return NextResponse.json({ error: "Facility not found" }, { status: 404 });

    // Authorization: admin or manager
    const isAuthorized = session.user.role === "admin" ||
      facility.managerIds.some((id: any) => id.toString() === session.user.id);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Update basic fields
    facility.name = name;
    facility.location = location;
    facility.description = description;
    facility.status = status;
    facility.contactPhone = contactPhone;
    facility.contactEmail = contactEmail;

    if (coordinatesRaw) {
      try {
        const coords = JSON.parse(coordinatesRaw);
        facility.coordinates = {
          lat: Number(coords.lat),
          lng: Number(coords.lng),
        };
      } catch (e) {
        console.warn("Invalid coordinates JSON:", e);
      }
    }

    // Update managers
    facility.managerIds = managerIdsRaw.map(id => id);

    // Handle deleted images
    if (deletedImages.length > 0) {
      facility.galleryImages = facility.galleryImages.filter(
        (img: string) => !deletedImages.includes(img)
      );
      
      if (deletedImages.includes(facility.coverImage)) {
        facility.coverImage = undefined;
      }

      for (const imgUrl of deletedImages) {
        await deleteImageFromBlob(imgUrl);
      }
    }

    // New cover image
    const newCover = formData.get("coverImage") as File;
    if (newCover instanceof File && newCover.size > 0) {
      const savedCoverUrl = await saveFacilityImageToBlob(newCover);
      facility.coverImage = savedCoverUrl;
    }

    // New gallery images
    const newGalleryFiles = formData.getAll("galleryImages") as File[];
    for (const file of newGalleryFiles) {
      if (file instanceof File && file.size > 0) {
        const savedPathUrl = await saveFacilityImageToBlob(file);
        facility.galleryImages.push(savedPathUrl);
      }
    }

    await facility.save();

    return NextResponse.json({
      success: true,
      facility: {
        _id: facility._id.toString(),
        ...facility.toObject(),
      },
    });
  } catch (error: any) {
    console.error("Facility PATCH error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}