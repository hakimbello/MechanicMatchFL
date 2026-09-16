import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProviderStatus } from "../domain/providers.ts";
import { canTransitionProviderStatus } from "../submissions/lifecycle.ts";
import {
  PUBLIC_PROVIDER_ROW_FIELDS,
  ProviderPersistenceError,
  mapProviderRecordRowToSubmission,
  mapPublicProviderRowToProvider,
  mapSubmissionToProviderRecordInsert,
  type ProviderAdminIdentity,
  type ProviderPersistence,
  type ProviderRecordRow,
  type PublicProviderRow
} from "./providerPersistence.ts";

export class SupabaseProviderPersistence implements ProviderPersistence {
  constructor(
    private readonly privilegedClient: SupabaseClient,
    private readonly publicClient: SupabaseClient = privilegedClient
  ) {}

  async createProviderSubmission(record: Parameters<ProviderPersistence["createProviderSubmission"]>[0]) {
    const insertRow = mapSubmissionToProviderRecordInsert(record);
    const { data, error } = await this.privilegedClient
      .from("provider_records")
      .insert(insertRow)
      .select("*")
      .single();

    if (error || !data) {
      throw new ProviderPersistenceError();
    }

    return mapProviderRecordRowToSubmission(data as ProviderRecordRow);
  }

  async listProviderSubmissionsForAdmin() {
    const { data, error } = await this.privilegedClient
      .from("provider_records")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error || !data) {
      throw new ProviderPersistenceError();
    }

    return (data as ProviderRecordRow[]).map(mapProviderRecordRowToSubmission);
  }

  async getProviderSubmissionForAdmin(id: string) {
    const { data, error } = await this.privilegedClient
      .from("provider_records")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new ProviderPersistenceError();
    }

    return data ? mapProviderRecordRowToSubmission(data as ProviderRecordRow) : null;
  }

  async transitionProviderStatus(id: string, status: ProviderStatus, admin: ProviderAdminIdentity) {
    const current = await this.getProviderSubmissionForAdmin(id);
    if (!current) {
      throw new ProviderPersistenceError("Provider submission was not found.");
    }

    if (!canTransitionProviderStatus(current.status, status)) {
      throw new ProviderPersistenceError("Provider status transition is not allowed.");
    }

    const { data, error } = await this.privilegedClient
      .from("provider_records")
      .update({
        status,
        last_reviewed_by: admin.userId
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new ProviderPersistenceError();
    }

    return mapProviderRecordRowToSubmission(data as ProviderRecordRow);
  }

  async listActivePublicProviders() {
    const { data, error } = await this.publicClient
      .from("active_public_providers")
      .select(PUBLIC_PROVIDER_ROW_FIELDS.join(","))
      .order("name", { ascending: true });

    if (error || !data) {
      throw new ProviderPersistenceError();
    }

    return (data as unknown as PublicProviderRow[])
      .map(mapPublicProviderRowToProvider)
      .filter((provider): provider is NonNullable<typeof provider> => Boolean(provider));
  }

  async getActivePublicProviderById(id: string) {
    const { data, error } = await this.publicClient
      .from("active_public_providers")
      .select(PUBLIC_PROVIDER_ROW_FIELDS.join(","))
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new ProviderPersistenceError();
    }

    return data ? mapPublicProviderRowToProvider(data as unknown as PublicProviderRow) : null;
  }
}
