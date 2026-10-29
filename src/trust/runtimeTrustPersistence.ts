import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { MissingSupabaseConfigurationError } from "../config/supabaseEnvironment.ts";
import { createSupabasePrivilegedDataClient, isSupabasePrivilegedDataConfigured } from "../supabase/serverClient.ts";
import { SupabaseTrustPersistence } from "./supabaseTrustPersistence.ts";
import type { TrustPersistence } from "./trustPersistence.ts";

export function getTrustPersistenceForRuntime(authenticatedClient?: SupabaseClient): TrustPersistence {
  if (!isSupabasePrivilegedDataConfigured()) throw new MissingSupabaseConfigurationError(["SUPABASE_SECRET_KEY"]);
  return new SupabaseTrustPersistence(createSupabasePrivilegedDataClient(), authenticatedClient);
}
