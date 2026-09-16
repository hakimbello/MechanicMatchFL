import type { ProviderStatus } from "../domain/providers.ts";
import type { ProviderPersistence, ProviderAdminIdentity } from "../providers/providerPersistence.ts";
import { canTransitionProviderStatus } from "../submissions/lifecycle.ts";

export type AdminLifecycleResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "invalid-transition" | "persistence-failure" };

export async function transitionProviderAsAdmin(
  id: string,
  status: ProviderStatus,
  admin: ProviderAdminIdentity,
  persistence: ProviderPersistence
): Promise<AdminLifecycleResult> {
  const current = await persistence.getProviderSubmissionForAdmin(id, admin);
  if (!current) {
    return { ok: false, reason: "not-found" };
  }

  if (!canTransitionProviderStatus(current.status, status)) {
    return { ok: false, reason: "invalid-transition" };
  }

  try {
    await persistence.transitionProviderStatus(id, status, admin);
    return { ok: true };
  } catch {
    return { ok: false, reason: "persistence-failure" };
  }
}
