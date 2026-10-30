import "server-only";

import type { PhotoPersistence } from "./photoPersistence.ts";
import { createOpaquePhotoObjectKeys, processProviderPhoto, PROVIDER_PHOTO_LIMITS, ProviderPhotoValidationError } from "./photoProcessing.ts";

export async function submitProviderPhoto(
  input: { userId: string; providerId: string; file: File; consentAttested: boolean },
  persistence: PhotoPersistence
) {
  if (!input.providerId.trim()) return { ok: false as const, error: "Choose a provider." };
  if (!(input.file instanceof File) || !input.file.size) return { ok: false as const, error: "Choose a photo." };
  if (input.file.size > PROVIDER_PHOTO_LIMITS.maxInputBytes) return { ok: false as const, error: "Choose an image no larger than 4 MB." };
  if (!input.consentAttested) return { ok: false as const, error: "Confirm that you may submit this photo for publication." };
  try {
    const photo = await processProviderPhoto(new Uint8Array(await input.file.arrayBuffer()));
    const keys = createOpaquePhotoObjectKeys(photo.originalExtension);
    await persistence.submitPhoto({
      userId: input.userId,
      providerId: input.providerId.trim(),
      photo,
      ...keys,
      consentAttested: true
    });
    return { ok: true as const };
  } catch (error) {
    if (error instanceof ProviderPhotoValidationError) return { ok: false as const, error: error.message };
    return { ok: false as const, error: "The photo could not be submitted. Please try again." };
  }
}
