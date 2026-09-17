"use server";

import { getAdminAuthorization } from "../../../src/admin/adminAuth.ts";
import { validatePasswordUpdate } from "../../../src/admin/passwordRecovery.ts";
import { createSupabaseServerAuthClient } from "../../../src/supabase/serverClient.ts";

export type UpdateRecoveryPasswordResult =
  | { ok: true }
  | {
      ok: false;
      reason: "invalid-input" | "invalid-session" | "update-failed";
      errors?: ReturnType<typeof validatePasswordUpdate>;
    };

export async function updateRecoveryPasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<UpdateRecoveryPasswordResult> {
  const errors = validatePasswordUpdate(input.password, input.confirmPassword);
  if (Object.keys(errors).length > 0) {
    return { ok: false, reason: "invalid-input", errors };
  }

  const authorization = await getAdminAuthorization();
  if (!authorization.ok) {
    return { ok: false, reason: "invalid-session" };
  }

  try {
    const supabase = await createSupabaseServerAuthClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: input.password });
    if (updateError) {
      return { ok: false, reason: "update-failed" };
    }

    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    if (signOutError) {
      return { ok: false, reason: "update-failed" };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: "update-failed" };
  }
}
