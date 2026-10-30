export type ProviderPhotoStatus = "pending" | "approved" | "rejected" | "removed";

export interface ProviderPhotoRecord {
  id: string;
  providerId: string;
  status: ProviderPhotoStatus;
  width: number;
  height: number;
  submittedAt: string;
  moderatedAt?: string;
  moderationReason?: string;
}

export interface PublicProviderPhoto {
  id: string;
  providerId: string;
  width: number;
  height: number;
  publishedAt: string;
}

export interface ProcessedProviderPhoto {
  originalBytes: Uint8Array;
  normalizedBytes: Uint8Array;
  originalMediaType: "image/jpeg" | "image/png" | "image/webp";
  originalExtension: "jpg" | "png" | "webp";
  width: number;
  height: number;
  digest: string;
}

export interface ProviderPhotoWorkspace {
  photos: ProviderPhotoRecord[];
}

export interface AdminPhotoWorkspace {
  photos: ProviderPhotoRecord[];
}
