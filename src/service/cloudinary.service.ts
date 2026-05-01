// services/cloudinary.service.ts
import { UploadApiResponse } from "cloudinary";
import cloudinary from "../config/coudinarry";

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Uploads a buffer directly to Cloudinary (no temp files).
 *
 * @param buffer   - Raw image buffer from multer memoryStorage
 * @param folder   - Cloudinary folder path  e.g. "tyres/apollo/alnac-4g"
 * @param publicId - Optional deterministic public ID (good for upserts)
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId?: string,
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: "image",
      // Auto-optimize quality and format for web delivery
      transformation: [{ quality: "auto", fetch_format: "auto" }],
      // Overwrite if same public_id already exists (upsert behaviour)
      overwrite: true,
      invalidate: true, // bust CDN cache on overwrite
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error || !result) {
          return reject(
            error ?? new Error("Cloudinary upload returned no result"),
          );
        }
        resolve(mapCloudinaryResult(result));
      },
    );

    stream.end(buffer);
  });
}

/**
 * Deletes an image from Cloudinary by its public ID.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary delete failed: ${result.result}`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapCloudinaryResult(raw: UploadApiResponse): CloudinaryUploadResult {
  return {
    publicId: raw.public_id,
    secureUrl: raw.secure_url,
    width: raw.width,
    height: raw.height,
    format: raw.format,
    bytes: raw.bytes,
  };
}
