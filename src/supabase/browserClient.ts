"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseClientSafeConfig } from "../config/supabaseEnvironment.ts";

export function createSupabaseBrowserClient() {
  const config = getSupabaseClientSafeConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  });
  return createBrowserClient(config.url, config.publishableKey);
}
