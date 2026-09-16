"use server";

import { signOutAdminSession, getAdminAuthorization } from "../../../src/admin/adminAuth.ts";

export async function completeAdminLoginAction(): Promise<
  { ok: true } | { ok: false; error: "missing-config" | "invalid" }
> {
  const authorization = await getAdminAuthorization();

  if (authorization.ok) {
    return { ok: true };
  }

  await signOutAdminSession();
  return {
    ok: false,
    error: authorization.reason === "missing-config" ? "missing-config" : "invalid"
  };
}
