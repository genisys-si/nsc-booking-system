import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { saveVenueImage } from "@/lib/upload";
import { put } from "@vercel/blob"; // Import Blob function

/**
 * Helper to upload venue images to Vercel Blob
 */
async function uploadVenueToBlob(file: File): Promise<string> {
  const timestamp = Date.now();
  // Clean filename to prevent encoding issues
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const fileName = `venues/${timestamp}-${cleanName}`;

  const blob = await put(fileName, file, {
    access: "public",
  });

  return blob.url;
}

export async function POST(req: NextRequest) {
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

    if (!facilityId || !name) {
      return NextResponse.json({ error: "Facility ID and name required" }, { status: 400 });
    }

    const facility = await Facility.findById(facilityId);
    if (!facility) return NextResponse.json({ error: "Facility not found" }, { status: 404 });

    // Authorization
    const isAuthorized = session.user.role === "admin" ||
      facility.managerIds.some((id: any) => id.toString() === session.user.id);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // --- HANDLE IMAGE UPLOADS VIA VERCEL BLOB ---
    const images: string[] = [];
    const imageFiles = formData.getAll("images") as File[];

    for (const file of imageFiles) {
      if (file instanceof File && file.size > 0) {
        // Upload to cloud instead of local disk
        const blobUrl = await uploadVenueToBlob(file);
        console.log("Uploaded to Blob:", blobUrl);
        images.push(blobUrl);
      }
    }

    // Add venue
    facility.venues.push({
      name,
      capacity,
      pricePerHour,
      isBookable,
      amenities,
      images,
    });

    await facility.save();

    return NextResponse.json({
      success: true,
      venue: facility.venues[facility.venues.length - 1],
    }, { status: 201 });
  } catch (error: any) {
    console.error("Venue create error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}