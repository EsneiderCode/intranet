import { writeFile, mkdir } from "fs/promises";
import path from "path";

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Uploads a file buffer to Cloudinary (if credentials are set)
 * or saves it locally under /public/uploads (dev fallback).
 */
export async function uploadAvatar(
  buffer: Buffer,
  filename: string
): Promise<UploadResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "umtelkomd/avatars", resource_type: "image" },
            (err, res) => {
              if (err || !res) return reject(err ?? new Error("Upload failed"));
              resolve(res as { secure_url: string; public_id: string });
            }
          )
          .end(buffer);
      }
    );

    return { url: result.secure_url, publicId: result.public_id };
  }

  // Dev fallback: save to /public/uploads/avatars/
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadsDir, { recursive: true });

  const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const filePath = path.join(uploadsDir, safeName);
  await writeFile(filePath, buffer);

  const url = `/uploads/avatars/${safeName}`;
  return { url, publicId: safeName };
}

export async function deleteAvatar(publicId: string): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    await cloudinary.uploader.destroy(publicId);
  }
  // Local: no need to clean up for dev purposes
}
