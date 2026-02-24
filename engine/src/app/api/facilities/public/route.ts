import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Facility from "@/models/Facility";


export async function GET() {
  await dbConnect();
  const facilities = await Facility.find({})
    .select("name venues")
    .lean();

  return NextResponse.json(facilities);
}