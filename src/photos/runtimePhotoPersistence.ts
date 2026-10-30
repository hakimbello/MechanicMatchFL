import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { MissingSupabaseConfigurationError } from "../config/supabaseEnvironment.ts";
import { createSupabasePrivilegedDataClient, isSupabasePrivilegedDataConfigured } from "../supabase/serverClient.ts";
import type { PhotoPersistence } from "./photoPersistence.ts";
import { SupabasePhotoPersistence } from "./supabasePhotoPersistence.ts";

export function getPhotoPersistenceForRuntime(authenticatedClient?: SupabaseClient): PhotoPersistence {
  if (!isSupabasePrivilegedDataConfigured()) throw new MissingSupabaseConfigurationError(["SUPABASE_SECRET_KEY"]);
  return new SupabasePhotoPersistence(createSupabasePrivilegedDataClient(), authenticatedClient);
}
