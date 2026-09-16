import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  getSupabaseClientSafeConfig,
  getSupabaseServerSecretConfig,
  hasSupabaseClientSafeConfig,
  hasSupabaseServerSecretConfig
} from "../config/supabaseEnvironment.ts";

export async function createSupabaseServerAuthClient() {
  const config = getSupabaseClientSafeConfig();
  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. The proxy refresh path handles normal session rotation.
        }
      }
    }
  });
}

export function createSupabasePublicDataClient() {
  const config = getSupabaseClientSafeConfig();
  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function createSupabasePrivilegedDataClient() {
  const config = getSupabaseServerSecretConfig();
  return createClient(config.url, config.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function isSupabaseAuthConfigured(): boolean {
  return hasSupabaseClientSafeConfig();
}

export function isSupabasePrivilegedDataConfigured(): boolean {
  return hasSupabaseServerSecretConfig();
}
