import type { ProviderAdminIdentity } from "../providers/providerPersistence.ts";
import type {
  AdminPhotoWorkspace,
  ProcessedProviderPhoto,
  ProviderPhotoWorkspace,
  PublicProviderPhoto
} from "./photoTypes.ts";

export interface SubmitProviderPhotoInput {
  providerId: string;
  photo: ProcessedProviderPhoto;
  originalObjectKey: string;
  normalizedObjectKey: string;
  consentAttested: true;
}

export interface PublicPhotoDownload {
  bytes: Uint8Array;
  digest: string;
}

export interface PhotoPersistence {
  getProviderWorkspace(userId: string): Promise<ProviderPhotoWorkspace>;
  submitPhoto(input: SubmitProviderPhotoInput): Promise<void>;
  getAdminWorkspace(admin: ProviderAdminIdentity): Promise<AdminPhotoWorkspace>;
  moderatePhoto(photoId: string, decision: "approved" | "rejected", reason: string): Promise<void>;
  removePhoto(photoId: string, reason: string): Promise<void>;
  downloadAdminPhoto(photoId: string): Promise<PublicPhotoDownload | null>;
  getPublicPhoto(providerId: string): Promise<PublicProviderPhoto | null>;
  downloadPublicPhoto(providerId: string): Promise<PublicPhotoDownload | null>;
}

export class PhotoPersistenceError extends Error {
  constructor(message = "Provider photo operation failed.") {
    super(message);
    this.name = "PhotoPersistenceError";
  }
}
