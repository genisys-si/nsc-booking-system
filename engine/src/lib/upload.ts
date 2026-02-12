import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "venues");
const UPLOAD_DIR_FACILTIES = path.join(process.cwd(), "public", "uploads", "facilities");

export async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create upload dir", err);
  }
}

export async function saveImage(file: File): Promise<string> {
  await ensureUploadDir();

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  await fs.writeFile(filepath, buffer);

  // Return public URL path
  return `/uploads/venues/${filename}`;
}

export async function deleteImage(imagePath: string) {
  if (!imagePath.startsWith("/uploads/venues/")) return;

  const filename = imagePath.split("/").pop();
  if (!filename) return;

  const fullPath = path.join(UPLOAD_DIR, filename);
  try {
    await fs.unlink(fullPath);
  } catch (err) {
    console.warn("Failed to delete image", fullPath, err);
  }
}

export async function ensureFacilityUploadDir() {
  await fs.mkdir(UPLOAD_DIR_FACILTIES, { recursive: true });
}

export async function uploadFacilityImage(file: File): Promise<string> {
  await ensureFacilityUploadDir();

  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(UPLOAD_DIR_FACILTIES, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  return `/uploads/facilities/${filename}`;
}