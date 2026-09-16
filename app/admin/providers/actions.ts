"use server";

import { getAdminAuthorization } from "../../../src/admin/adminAuth.ts";
import { transitionProviderAsAdmin } from "../../../src/admin/adminLifecycleService.ts";
import { PROVIDER_STATUSES, type ProviderStatus } from "../../../src/domain/providers.ts";
import { getProviderPersistenceForRuntime } from "../../../src/providers/runtimeProviderPersistence.ts";
import type { ProviderSubmissionRecord } from "../../../src/submissions/submissionTypes.ts";

export type AdminTransitionActionResult =
  | { ok: true; records: ProviderSubmissionRecord[] }
  | { ok: false; error: string };

export async function transitionProviderStatusAction(
  id: string,
  status: ProviderStatus
): Promise<AdminTransitionActionResult> {
  if (!PROVIDER_STATUSES.includes(status)) {
    return { ok: false, error: "Requested provider status is not valid." };
  }

  const authorization = await getAdminAuthorization();
  if (!authorization.ok) {
    return { ok: false, error: "You are not authorized to update provider submissions." };
  }

  try {
    const persistence = getProviderPersistenceForRuntime();
    const transition = await transitionProviderAsAdmin(id, status, authorization.admin, persistence);

    if (!transition.ok) {
      return {
        ok: false,
        error:
          transition.reason === "invalid-transition"
            ? "That lifecycle transition is not allowed."
            : "Provider status could not be updated."
      };
    }

    return {
      ok: true,
      records: await persistence.listProviderSubmissionsForAdmin(authorization.admin)
    };
  } catch {
    return { ok: false, error: "Provider status could not be updated." };
  }
}
