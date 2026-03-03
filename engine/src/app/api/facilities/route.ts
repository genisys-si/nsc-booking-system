import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { uploadFacilityImage } from "@/lib/upload";
import { put } from "@vercel/blob"; 

/**
 * Helper to upload to Vercel Blob
 */
async function uploadToBlob(file: File, folder: string): Promise<string> {
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const fileName = `${folder}/${timestamp}-${cleanName}`;

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
    //const body = await req.json();
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const description = formData.get("description") as string;
    const status = formData.get("status") as string;
    const coordinatesRaw = formData.get("coordinates");
    const managerIdsRaw = formData.getAll("managerIds");

    const coordinates = coordinatesRaw ? JSON.parse(coordinatesRaw as string) : undefined;

    // 1. Handle Cover Image Upload to Blob
    const coverImageFile = formData.get("coverImage") as File;
    let coverImageURL: string | undefined;
    if (coverImageFile && coverImageFile.size > 0) {
      coverImageURL = await uploadToBlob(coverImageFile, "facilities/covers");
    }

    // 2. Handle Gallery Images Upload to Blob
    const galleryFiles = formData.getAll("galleryImages") as File[];
    const galleryURLs: string[] = [];
    for (const file of galleryFiles) {
      if (file instanceof File && file.size > 0) {
        const url = await uploadToBlob(file, "facilities/gallery");
        galleryURLs.push(url);
      }
    }

    if (!name || !location) {
      return NextResponse.json(
        { error: "Name and location are required" },
        { status: 400 }
      );
    }


    // Create facility
    const facility = await Facility.create({
      name,
      location,
      description,
      status,
      coordinates,
      coverImage: coverImageURL,
      galleryImages: galleryURLs,
      managerIds: managerIdsRaw,
      createdBy: session.user.id,
    });

    return NextResponse.json({ success: true, facility }, { status: 201 });
  } catch (error: any) {
    console.error("Create facility error:", error);
    return NextResponse.json(
      { error: "Failed to create facility" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const facilities = await Facility.find({}).lean();
    return NextResponse.json(facilities, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error: any) {
    console.error('Facilities GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}