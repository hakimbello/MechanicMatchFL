import "server-only";

import { MissingSupabaseConfigurationError } from "../config/supabaseEnvironment.ts";
import { createSupabaseServerAuthClient, isSupabaseAuthConfigured } from "../supabase/serverClient.ts";

export type ProviderAuthenticationResult =
  | { ok: true; user: { userId: string } }
  | { ok: false; reason: "missing-config" | "unauthenticated" };

export async function getProviderAuthentication(): Promise<ProviderAuthenticationResult> {
  if (!isSupabaseAuthConfigured()) return { ok: false, reason: "missing-config" };
  try {
    const client = await createSupabaseServerAuthClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return { ok: false, reason: "unauthenticated" };
    return { ok: true, user: { userId: user.id } };
  } catch (error) {
    if (error instanceof MissingSupabaseConfigurationError) return { ok: false, reason: "missing-config" };
    return { ok: false, reason: "unauthenticated" };
  }
}

export async function signOutProviderSession() {
  if (!isSupabaseAuthConfigured()) return;
  const client = await createSupabaseServerAuthClient();
  await client.auth.signOut();
}
