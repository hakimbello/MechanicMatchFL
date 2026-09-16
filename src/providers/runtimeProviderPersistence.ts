import "server-only";

import {
  MissingSupabaseConfigurationError,
  SUPABASE_CLIENT_SAFE_ENV_VARS
} from "../config/supabaseEnvironment.ts";
import { DEVELOPMENT_PROVIDERS } from "../fixtures/developmentProviders.ts";
import { createSupabasePrivilegedDataClient, createSupabasePublicDataClient, isSupabaseAuthConfigured, isSupabasePrivilegedDataConfigured } from "../supabase/serverClient.ts";
import { InMemoryProviderPersistence, type ProviderPersistence } from "./providerPersistence.ts";
import { SupabaseProviderPersistence } from "./supabaseProviderPersistence.ts";

const developmentPersistence = new InMemoryProviderPersistence();

export function getProviderPersistenceForRuntime(env: Pick<NodeJS.ProcessEnv, "NODE_ENV"> = process.env): ProviderPersistence {
  if (isSupabasePrivilegedDataConfigured()) {
    return new SupabaseProviderPersistence(createSupabasePrivilegedDataClient(), createSupabasePublicDataClient());
  }

  if (env.NODE_ENV === "production") {
    throw new MissingSupabaseConfigurationError(["SUPABASE_SECRET_KEY"]);
  }

  return developmentPersistence;
}

export async function listRuntimePublicProviders(env: Pick<NodeJS.ProcessEnv, "NODE_ENV"> = process.env) {
  if (env.NODE_ENV === "production") {
    if (!isSupabaseAuthConfigured()) {
      return [];
    }

    return new SupabaseProviderPersistence(createSupabasePublicDataClient()).listActivePublicProviders();
  }

  return DEVELOPMENT_PROVIDERS;
}

export async function getRuntimePublicProviderById(id: string, env: Pick<NodeJS.ProcessEnv, "NODE_ENV"> = process.env) {
  if (env.NODE_ENV === "production") {
    if (!isSupabaseAuthConfigured()) {
      throw new MissingSupabaseConfigurationError([...SUPABASE_CLIENT_SAFE_ENV_VARS]);
    }

    return new SupabaseProviderPersistence(createSupabasePublicDataClient()).getActivePublicProviderById(id);
  }

  const providers = await listRuntimePublicProviders(env);
  return providers.find((provider) => provider.id === id && provider.status === "active") ?? null;
}

export async function listRuntimePublicProviderIds(env: Pick<NodeJS.ProcessEnv, "NODE_ENV"> = process.env) {
  const providers = await listRuntimePublicProviders(env);
  return providers.filter((provider) => provider.status === "active").map((provider) => provider.id);
}
