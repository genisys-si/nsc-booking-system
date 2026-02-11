import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";

export async function GET() {
  try {
    await dbConnect();
    const facilities = await Facility.find({})
      .lean() // faster, plain JS objects
      .select("name location venues"); // only needed fields

    return NextResponse.json(facilities);
  } catch (error) {
    console.error("GET /api/facilities error:", error);
    return NextResponse.json(
      { error: "Failed to fetch facilities" },
      { status: 500 }
    );
  }
}

// Optional: POST for admin to create facilities (protect later)
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const newFacility = await Facility.create(body);
    return NextResponse.json(newFacility, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create facility" }, { status: 500 });
  }
}