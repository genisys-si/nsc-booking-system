import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {put, del} from "@vercel/blob"; // Import Blob functions



/**
 * Uploads a venue image to Vercel Blob
 */
async function saveVenueImageToBlob(file: File): Promise<string | null> {
  if (!(file instanceof File) || file.size <= 0 || !file.name) {
    console.warn("Invalid file skipped in saveVenueImageToBlob:", file);
    return null;
  }

  try {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const fileName = `venues/${timestamp}-${cleanName}`;

    const blob = await put(fileName, file, {
      access: "public",
    });

    return blob.url;
  } catch (err) {
    console.error("Vercel Blob upload error:", err);
    return null;
  }
}

/**
 * Deletes an image from Vercel Blob
 */
async function deleteImageFromBlob(url: string) {
  // Only attempt deletion if it's a Vercel Blob URL
  if (!url || !url.includes("public.blob.vercel-storage.com")) return;

  try {
    await del(url);
    console.log(`Deleted blob image: ${url}`);
  } catch (err) {
    console.warn(`Blob delete failed: ${url}`, err);
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

    // 1. Handle deleted images (Vercel Blob del)
    if (deletedImages.length > 0) {
      venue.images = venue.images.filter((img: string) => !deletedImages.includes(img));

      for (const imgUrl of deletedImages) {
        await deleteImageFromBlob(imgUrl);
      }
    }

    // 2. Handle new images (Vercel Blob put)
    const newImageFiles = formData.getAll("images");
    for (const item of newImageFiles) {
      if (item instanceof File && item.size > 0 && item.name) {
        try {
          const savedUrl = await saveVenueImageToBlob(item);
          if (savedUrl) {
            venue.images.push(savedUrl);
          }
        } catch (err) {
          console.error("Failed to upload image to blob:", err);
        }
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