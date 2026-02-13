import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";
import { uuidv4 } from "zod";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "facilities");

async function deleteImageFromDisk(imagePath: string) {
  if (!imagePath.startsWith("/uploads/facilities/")) return;

  const filename = imagePath.split("/").pop();
  if (!filename) return;

  const fullPath = path.join(UPLOAD_DIR, filename);

  try {
    await fs.unlink(fullPath);
    console.log(`Deleted facility image: ${fullPath}`);
  } catch (err) {
    console.warn(`Failed to delete image ${fullPath}:`, err);
  }
}

async function saveFacilityImage(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, buffer);

  return `/uploads/facilities/${filename}`;
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
      facility.coverImage = deletedImages.includes(facility.coverImage)
        ? undefined
        : facility.coverImage;

      // Delete from disk
      for (const imgPath of deletedImages) {
        await deleteImageFromDisk(imgPath);
      }
    }

    // New cover image
    const newCover = formData.get("coverImage") as File;
    if (newCover instanceof File && newCover.size > 0) {
      const savedCover = await saveFacilityImage(newCover);
      facility.coverImage = savedCover;
    }

    // New gallery images
    const newGalleryFiles = formData.getAll("galleryImages") as File[];
    for (const file of newGalleryFiles) {
      if (file instanceof File && file.size > 0) {
        const savedPath = await saveFacilityImage(file);
        facility.galleryImages.push(savedPath);
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