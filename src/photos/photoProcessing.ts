import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";

import type { ProcessedProviderPhoto } from "./photoTypes.ts";

export const PROVIDER_PHOTO_LIMITS = {
  maxInputBytes: 4 * 1024 * 1024,
  maxInputPixels: 25_000_000,
  maxInputDimension: 6000,
  minWidth: 320,
  minHeight: 240,
  outputWidth: 1600,
  outputHeight: 1200
} as const;

export class ProviderPhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderPhotoValidationError";
  }
}

const allowedFormats = {
  jpeg: { mediaType: "image/jpeg", extension: "jpg" },
  png: { mediaType: "image/png", extension: "png" },
  webp: { mediaType: "image/webp", extension: "webp" }
} as const;

export async function processProviderPhoto(bytes: Uint8Array): Promise<ProcessedProviderPhoto> {
  if (!bytes.byteLength || bytes.byteLength > PROVIDER_PHOTO_LIMITS.maxInputBytes) {
    throw new ProviderPhotoValidationError("Choose an image no larger than 4 MB.");
  }

  try {
    const input = Buffer.from(bytes);
    const image = sharp(input, {
      failOn: "warning",
      limitInputPixels: PROVIDER_PHOTO_LIMITS.maxInputPixels,
      sequentialRead: true
    });
    const metadata = await image.metadata();
    const format = metadata.format && allowedFormats[metadata.format as keyof typeof allowedFormats];
    if (!format) throw new ProviderPhotoValidationError("Use a JPEG, PNG, or WebP image.");
    if ((metadata.pages ?? 1) !== 1) throw new ProviderPhotoValidationError("Animated or multi-page images are not allowed.");
    if (!metadata.width || !metadata.height) throw new ProviderPhotoValidationError("The image dimensions could not be verified.");
    if (
      metadata.width < PROVIDER_PHOTO_LIMITS.minWidth ||
      metadata.height < PROVIDER_PHOTO_LIMITS.minHeight ||
      metadata.width > PROVIDER_PHOTO_LIMITS.maxInputDimension ||
      metadata.height > PROVIDER_PHOTO_LIMITS.maxInputDimension ||
      metadata.width * metadata.height > PROVIDER_PHOTO_LIMITS.maxInputPixels
    ) {
      throw new ProviderPhotoValidationError("Use an image between 320x240 and 6000x6000 pixels.");
    }

    const normalized = await sharp(input, {
      failOn: "warning",
      limitInputPixels: PROVIDER_PHOTO_LIMITS.maxInputPixels,
      sequentialRead: true
    })
      .rotate()
      .resize({
        width: PROVIDER_PHOTO_LIMITS.outputWidth,
        height: PROVIDER_PHOTO_LIMITS.outputHeight,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    return {
      originalBytes: input,
      normalizedBytes: normalized.data,
      originalMediaType: format.mediaType,
      originalExtension: format.extension,
      width: normalized.info.width,
      height: normalized.info.height,
      digest: createHash("sha256").update(normalized.data).digest("hex")
    };
  } catch (error) {
    if (error instanceof ProviderPhotoValidationError) throw error;
    throw new ProviderPhotoValidationError("The image could not be safely decoded.");
  }
}

export function createOpaquePhotoObjectKeys(extension: ProcessedProviderPhoto["originalExtension"]) {
  const id = randomUUID();
  return {
    originalObjectKey: `original/${id}.${extension}`,
    normalizedObjectKey: `normalized/${id}.webp`
  };
}
