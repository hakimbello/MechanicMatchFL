import type { ProcessedProviderPhoto } from "./photoTypes.ts";

export interface PhotoObjectStore {
  upload(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export interface PhotoRecordStore {
  create(input: {
    userId: string;
    providerId: string;
    originalObjectKey: string;
    normalizedObjectKey: string;
    originalMediaType: string;
    byteSize: number;
    width: number;
    height: number;
    digest: string;
    consentAttested: true;
  }): Promise<void>;
}

export async function persistPhotoUpload(
  input: {
    userId: string;
    providerId: string;
    originalObjectKey: string;
    normalizedObjectKey: string;
    consentAttested: true;
    photo: ProcessedProviderPhoto;
  },
  objects: PhotoObjectStore,
  records: PhotoRecordStore
) {
  const uploaded: string[] = [];
  try {
    await objects.upload(input.originalObjectKey, input.photo.originalBytes, input.photo.originalMediaType);
    uploaded.push(input.originalObjectKey);
    await objects.upload(input.normalizedObjectKey, input.photo.normalizedBytes, "image/webp");
    uploaded.push(input.normalizedObjectKey);
    await records.create({
      userId: input.userId,
      providerId: input.providerId,
      originalObjectKey: input.originalObjectKey,
      normalizedObjectKey: input.normalizedObjectKey,
      originalMediaType: input.photo.originalMediaType,
      byteSize: input.photo.originalBytes.byteLength,
      width: input.photo.width,
      height: input.photo.height,
      digest: input.photo.digest,
      consentAttested: input.consentAttested
    });
  } catch (error) {
    if (uploaded.length) {
      try {
        await objects.remove(uploaded);
      } catch {
        // Cleanup is best-effort and orphan keys are opaque; the runbook covers reconciliation.
      }
    }
    throw error;
  }
}
