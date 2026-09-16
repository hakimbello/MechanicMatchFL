"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseClientSafeConfig } from "../config/supabaseEnvironment.ts";

export function createSupabaseBrowserClient() {
  const config = getSupabaseClientSafeConfig();
  return createBrowserClient(config.url, config.publishableKey);
}
