import "server-only";

import { MissingSupabaseConfigurationError } from "../config/supabaseEnvironment.ts";
import { createSupabaseServerAuthClient, isSupabaseAuthConfigured } from "../supabase/serverClient.ts";

export interface AuthorizedAdmin {
  userId: string;
}

export type AdminAuthorizationResult =
  | { ok: true; admin: AuthorizedAdmin }
  | { ok: false; reason: "missing-config" | "unauthenticated" | "unauthorized" };

export async function getAdminAuthorization(): Promise<AdminAuthorizationResult> {
  if (!isSupabaseAuthConfigured()) {
    return { ok: false, reason: "missing-config" };
  }

  try {
    const supabase = await createSupabaseServerAuthClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { ok: false, reason: "unauthenticated" };
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_mechanicmatch_admin");
    if (adminError || isAdmin !== true) {
      return { ok: false, reason: "unauthorized" };
    }

    return { ok: true, admin: { userId: user.id } };
  } catch (error) {
    if (error instanceof MissingSupabaseConfigurationError) {
      return { ok: false, reason: "missing-config" };
    }

    return { ok: false, reason: "unauthenticated" };
  }
}

export async function signOutAdminSession() {
  if (!isSupabaseAuthConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerAuthClient();
  await supabase.auth.signOut();
}

export async function signInAdminWithPassword(input: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; reason: "missing-config" | "invalid" }> {
  if (!isSupabaseAuthConfigured()) {
    return { ok: false, reason: "missing-config" };
  }

  const supabase = await createSupabaseServerAuthClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password
  });

  if (error) {
    return { ok: false, reason: "invalid" };
  }

  const authorization = await getAdminAuthorization();
  if (!authorization.ok) {
    await supabase.auth.signOut();
    return { ok: false, reason: authorization.reason === "missing-config" ? "missing-config" : "invalid" };
  }

  return { ok: true };
}
