import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { MissingSupabaseConfigurationError } from "../config/supabaseEnvironment.ts";
import {
  createSupabasePrivilegedDataClient,
  createSupabasePublicDataClient,
  isSupabaseAuthConfigured,
  isSupabasePrivilegedDataConfigured
} from "../supabase/serverClient.ts";
import { InMemoryReviewPersistence, type ReviewPersistence } from "./reviewPersistence.ts";
import { SupabaseReviewPersistence } from "./supabaseReviewPersistence.ts";

const developmentPersistence = new InMemoryReviewPersistence();

export function getReviewPersistenceForRuntime(
  env: Pick<NodeJS.ProcessEnv, "NODE_ENV"> = process.env,
  authenticatedAdminClient?: SupabaseClient
): ReviewPersistence {
  if (isSupabasePrivilegedDataConfigured()) {
    return new SupabaseReviewPersistence(
      createSupabasePrivilegedDataClient(),
      createSupabasePublicDataClient(),
      authenticatedAdminClient
    );
  }
  if (env.NODE_ENV === "production") throw new MissingSupabaseConfigurationError(["SUPABASE_SECRET_KEY"]);
  return developmentPersistence;
}

export function getPublicReviewPersistenceForRuntime(env: Pick<NodeJS.ProcessEnv, "NODE_ENV"> = process.env): ReviewPersistence {
  if (env.NODE_ENV === "production") {
    if (!isSupabaseAuthConfigured()) throw new MissingSupabaseConfigurationError(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
    return new SupabaseReviewPersistence(createSupabasePublicDataClient());
  }
  return developmentPersistence;
}
