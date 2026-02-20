import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "venues");

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});
}

async function saveVenueImage(file: any): Promise<string | null> {
  // Safety: skip invalid files
  if (!(file instanceof File) || file.size <= 0 || !file.name) {
    console.warn("Invalid file skipped in saveVenueImage:", file);
    return null;
  }

  await ensureUploadDir();

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  try {
    await fs.writeFile(filepath, buffer);
    return `/uploads/venues/${filename}`;
  } catch (err) {
    console.error("File write error:", err);
    return null;
  }
}

async function deleteImageFromDisk(imagePath: string) {
  if (!imagePath || !imagePath.startsWith("/uploads/venues/")) return;

  const filename = imagePath.split("/").pop();
  if (!filename) return;

  const fullPath = path.join(UPLOAD_DIR, filename);

  try {
    await fs.unlink(fullPath);
    console.log(`Deleted: ${fullPath}`);
  } catch (err) {
    console.warn(`Delete failed: ${fullPath}`, err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ venueId: string }> }
) {
  const params = await paramsPromise;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const formData = await req.formData();

    const facilityId = formData.get("facilityId") as string;
    const name = formData.get("name") as string;
    const isBookable = formData.get("isBookable") === "true";

    const capacityRaw = formData.get("capacity");
    const capacity = capacityRaw && !isNaN(Number(capacityRaw))
      ? Number(capacityRaw)
      : undefined;

    const pricePerHourRaw = formData.get("pricePerHour");
    const pricePerHour = pricePerHourRaw && !isNaN(Number(pricePerHourRaw))
      ? Number(pricePerHourRaw)
      : 0;

    const amenitiesRaw = formData.get("amenities") as string;
    const amenities = amenitiesRaw ? JSON.parse(amenitiesRaw) : [];

    const deletedImagesRaw = formData.get("deletedImages") as string;
    const deletedImages = deletedImagesRaw ? JSON.parse(deletedImagesRaw) : [];

    if (!facilityId || !name) {
      return NextResponse.json({ error: "Facility ID and name required" }, { status: 400 });
    }

    const facility = await Facility.findById(facilityId);
    if (!facility) return NextResponse.json({ error: "Facility not found" }, { status: 404 });

    const isAuthorized = session.user.role === "admin" ||
      facility.managerIds.some((id: any) => id.toString() === session.user.id);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const venue = facility.venues.id(params.venueId);
    if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

    // Update fields
    venue.name = name;
    venue.capacity = capacity;
    venue.pricePerHour = pricePerHour;
    venue.isBookable = isBookable;
    venue.amenities = amenities;

    // Handle deleted images
    if (deletedImages.length > 0) {
      venue.images = venue.images.filter((img: string) => !deletedImages.includes(img));

      for (const imgPath of deletedImages) {
        await deleteImageFromDisk(imgPath);
      }
    }

    // Handle new images – very defensive
    const newImageFiles = formData.getAll("images");
    for (const item of newImageFiles) {
      if (item instanceof File && item.size > 0 && item.name) {
        try {
          const savedPath = await saveVenueImage(item);
          if (savedPath) {
            venue.images.push(savedPath);
          }
        } catch (err) {
          console.error("Failed to save image:", err);
        }
      } else {
        console.warn("Skipped invalid file item:", item);
      }
    }

    await facility.save();

    return NextResponse.json({
      success: true,
      venue: {
        _id: venue._id.toString(),
        name: venue.name,
        capacity: venue.capacity,
        pricePerHour: venue.pricePerHour,
        isBookable: venue.isBookable,
        amenities: venue.amenities,
        images: venue.images,
      },
    });
  } catch (error: any) {
    console.error("Venue PATCH error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ venueId: string }> }
) {
  const params = await paramsPromise;
  await dbConnect();
  try {
    const facility = await Facility.findOne({ 'venues._id': params.venueId }, { 'venues.$': 1, name: 1 }).lean();
    if (!facility || !facility.venues || facility.venues.length === 0) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    const venue = facility.venues[0];
    return NextResponse.json({ facilityName: facility.name, venue }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error: any) {
    console.error('Venue GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}