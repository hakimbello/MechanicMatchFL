"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getProviderAuthentication, signOutProviderSession } from "../../../src/providers/providerAuth.ts";
import { createSupabaseServerAuthClient } from "../../../src/supabase/serverClient.ts";
import { getTrustPersistenceForRuntime } from "../../../src/trust/runtimeTrustPersistence.ts";
import { submitProviderAppeal, submitProviderClaim, submitProviderResponse, submitReviewDispute } from "../../../src/trust/trustService.ts";

async function context() {
  const authentication = await getProviderAuthentication();
  if (!authentication.ok) redirect("/provider/login");
  const client = await createSupabaseServerAuthClient();
  return { persistence: getTrustPersistenceForRuntime(client) };
}

export async function submitClaimAction(formData: FormData) {
  const { persistence } = await context();
  await submitProviderClaim(String(formData.get("providerId") ?? ""), String(formData.get("evidence") ?? ""), persistence);
  revalidatePath("/provider/account");
}

export async function submitResponseAction(formData: FormData) {
  const { persistence } = await context();
  await submitProviderResponse(String(formData.get("reviewId") ?? ""), String(formData.get("responseText") ?? ""), persistence);
  revalidatePath("/provider/account");
}

export async function submitDisputeAction(formData: FormData) {
  const { persistence } = await context();
  await submitReviewDispute(String(formData.get("reviewId") ?? ""), String(formData.get("reason") ?? ""), persistence);
  revalidatePath("/provider/account");
}

export async function submitAppealAction(formData: FormData) {
  const { persistence } = await context();
  await submitProviderAppeal(String(formData.get("providerId") ?? ""), String(formData.get("reason") ?? ""), persistence);
  revalidatePath("/provider/account");
}

export async function providerSignOutAction() {
  await signOutProviderSession();
  redirect("/provider/login");
}
