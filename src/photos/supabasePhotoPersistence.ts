import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProviderAdminIdentity } from "../providers/providerPersistence.ts";
import { PhotoPersistenceError, type PhotoPersistence, type SubmitProviderPhotoInput } from "./photoPersistence.ts";
import { persistPhotoUpload, PhotoFinalizationStateUnknownError } from "./photoUploadTransaction.ts";
import type { ProviderPhotoRecord, PublicProviderPhoto } from "./photoTypes.ts";

export const PROVIDER_PHOTO_BUCKET = "provider-photos-private";

export class SupabasePhotoPersistence implements PhotoPersistence {
  constructor(
    private readonly privilegedClient: SupabaseClient,
    private readonly authenticatedClient?: SupabaseClient
  ) {}

  async getProviderWorkspace(userId: string) {
    const { data, error } = await this.privilegedClient
      .from("provider_photos")
      .select("id,provider_id,status,width,height,submitted_at,moderated_at,moderation_reason")
      .eq("submitted_by", userId)
      .order("submitted_at", { ascending: false });
    if (error || !data) throw new PhotoPersistenceError();
    return { photos: data.map(mapPhoto) };
  }

  async submitPhoto(input: SubmitProviderPhotoInput) {
    if (!this.authenticatedClient) throw new PhotoPersistenceError();
    const { data: { user }, error: userError } = await this.authenticatedClient.auth.getUser();
    if (userError || !user) throw new PhotoPersistenceError();
    const bucket = this.privilegedClient.storage.from(PROVIDER_PHOTO_BUCKET);
    try {
      await persistPhotoUpload(
        input,
        {
          upload: async (key, bytes, contentType) => {
            const { error } = await bucket.upload(key, bytes, { contentType, upsert: false });
            if (error) throw error;
          },
          remove: async (keys) => {
            const { error } = await bucket.remove(keys);
            if (error) throw error;
          }
        },
        {
          create: async (record) => {
            const { data: ticket, error: ticketError } = await this.privilegedClient
              .from("provider_photo_upload_tickets")
              .insert({
                auth_user_id: user.id,
                provider_id: record.providerId,
                original_object_key: record.originalObjectKey,
                normalized_object_key: record.normalizedObjectKey,
                original_media_type: record.originalMediaType,
                byte_size: record.byteSize,
                width: record.width,
                height: record.height,
                content_sha256: record.digest,
                consent_attested: record.consentAttested
              })
              .select("id")
              .single();
            if (ticketError || !ticket) throw new PhotoPersistenceError();
            const { data, error } = await this.authenticatedClient!.rpc("submit_provider_photo", {
              p_upload_ticket_id: ticket.id
            });
            if (!error && data === true) return;
            const { data: ticketState, error: ticketStateError } = await this.privilegedClient
              .from("provider_photo_upload_tickets")
              .select("consumed_at")
              .eq("id", ticket.id)
              .maybeSingle();
            if (ticketState?.consumed_at) return;
            if (ticketStateError || !ticketState) throw new PhotoFinalizationStateUnknownError();
            const { error: deleteError } = await this.privilegedClient
              .from("provider_photo_upload_tickets")
              .delete()
              .eq("id", ticket.id);
            if (deleteError) throw new PhotoFinalizationStateUnknownError();
            throw new PhotoPersistenceError();
          }
        }
      );
    } catch {
      throw new PhotoPersistenceError();
    }
  }

  async getAdminWorkspace(_admin: ProviderAdminIdentity) {
    const { data, error } = await this.privilegedClient
      .from("provider_photos")
      .select("id,provider_id,status,width,height,submitted_at,moderated_at,moderation_reason")
      .order("submitted_at", { ascending: false });
    if (error || !data) throw new PhotoPersistenceError();
    return { photos: data.map(mapPhoto) };
  }

  moderatePhoto(photoId: string, decision: "approved" | "rejected", reason: string) {
    return this.callAuthenticated("admin_moderate_provider_photo", {
      p_photo_id: photoId,
      p_decision: decision,
      p_reason: reason
    });
  }

  removePhoto(photoId: string, reason: string) {
    return this.callAuthenticated("admin_remove_provider_photo", {
      p_photo_id: photoId,
      p_reason: reason
    });
  }

  async downloadAdminPhoto(photoId: string) {
    return this.downloadPhotoObject(photoId, false);
  }

  private async downloadPhotoObject(photoId: string, requireApproved: boolean) {
    let query = this.privilegedClient
      .from("provider_photos")
      .select("normalized_object_key,content_sha256")
      .eq("id", photoId);
    if (requireApproved) query = query.eq("status", "approved");
    const { data: row, error: rowError } = await query.maybeSingle();
    if (rowError) throw new PhotoPersistenceError();
    if (!row) return null;
    const { data, error } = await this.privilegedClient.storage
      .from(PROVIDER_PHOTO_BUCKET)
      .download(String(row.normalized_object_key));
    if (error || !data) throw new PhotoPersistenceError();
    return {
      bytes: new Uint8Array(await data.arrayBuffer()),
      digest: String(row.content_sha256)
    };
  }

  async getPublicPhoto(providerId: string): Promise<PublicProviderPhoto | null> {
    const { data, error } = await this.privilegedClient
      .from("approved_public_provider_photos")
      .select("photo_id,provider_id,width,height,published_at")
      .eq("provider_id", providerId)
      .maybeSingle();
    if (error) throw new PhotoPersistenceError();
    return data ? {
      id: String(data.photo_id),
      providerId: String(data.provider_id),
      width: Number(data.width),
      height: Number(data.height),
      publishedAt: String(data.published_at)
    } : null;
  }

  async downloadPublicPhoto(providerId: string) {
    const photo = await this.getPublicPhoto(providerId);
    if (!photo) return null;
    const object = await this.downloadPhotoObject(photo.id, true);
    if (!object) return null;
    const confirmed = await this.getPublicPhoto(providerId);
    return confirmed?.id === photo.id ? object : null;
  }

  private async callAuthenticated(functionName: string, parameters: Record<string, unknown>): Promise<void> {
    if (!this.authenticatedClient) throw new PhotoPersistenceError();
    const { data, error } = await this.authenticatedClient.rpc(functionName, parameters);
    if (error || data !== true) throw new PhotoPersistenceError();
  }
}

type Row = Record<string, unknown>;
function mapPhoto(row: Row): ProviderPhotoRecord {
  return {
    id: String(row.id),
    providerId: String(row.provider_id),
    status: row.status as ProviderPhotoRecord["status"],
    width: Number(row.width),
    height: Number(row.height),
    submittedAt: String(row.submitted_at),
    moderatedAt: row.moderated_at == null ? undefined : String(row.moderated_at),
    moderationReason: row.moderation_reason == null ? undefined : String(row.moderation_reason)
  };
}
