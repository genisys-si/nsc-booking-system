import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";


const FACILTIES_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "facilities");

const VENUE_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "venues");

export async function ensureVenueUploadDir() {
  try {
    await fs.mkdir(VENUE_UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create venue upload dir", err);
  }
}

export async function saveVenueImage(file: File): Promise<string> {
  await ensureVenueUploadDir();

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(VENUE_UPLOAD_DIR, filename);

  await fs.writeFile(filepath, buffer);

  // Return public URL path
  return `/uploads/venues/${filename}`;
}

export async function ensureFacilityUploadDir() {
  await fs.mkdir(FACILTIES_UPLOAD_DIR, { recursive: true });
}

export async function uploadFacilityImage(file: File): Promise<string> {
  await ensureFacilityUploadDir();

  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(FACILTIES_UPLOAD_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  return `/uploads/facilities/${filename}`;
}