import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    const {
      facilityId,
      name,
      capacity,
      pricePerHour,
      isBookable,
      amenities,
    } = body;

    if (!facilityId || !name) {
      return NextResponse.json(
        { error: "Facility ID and name required" },
        { status: 400 }
      );
    }

    const facility = await Facility.findById(facilityId);
    if (!facility) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    // Authorization: current user must be manager or admin
    const isAuthorized =
      session.user.role === "admin" ||
      facility.managerIds.some((id: any) => id.toString() === session.user.id);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Add venue
    facility.venues.push({
      name,
      capacity,
      pricePerHour: pricePerHour ?? 0,
      isBookable: isBookable ?? false,
      amenities: amenities ?? [],
    });

    await facility.save();

    return NextResponse.json(
      { success: true, venue: facility.venues.at(-1) },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}