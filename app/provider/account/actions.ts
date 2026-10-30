"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getProviderAuthentication, signOutProviderSession } from "../../../src/providers/providerAuth.ts";
import { getPhotoPersistenceForRuntime } from "../../../src/photos/runtimePhotoPersistence.ts";
import { submitProviderPhoto } from "../../../src/photos/photoService.ts";
import { createSupabaseServerAuthClient } from "../../../src/supabase/serverClient.ts";
import { getTrustPersistenceForRuntime } from "../../../src/trust/runtimeTrustPersistence.ts";
import { submitProviderAppeal, submitProviderClaim, submitProviderResponse, submitReviewDispute } from "../../../src/trust/trustService.ts";

async function context() {
  const authentication = await getProviderAuthentication();
  if (!authentication.ok) redirect("/provider/login");
  const client = await createSupabaseServerAuthClient();
  return {
    persistence: getTrustPersistenceForRuntime(client),
    photoPersistence: getPhotoPersistenceForRuntime(client)
  };
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

export async function submitPhotoAction(formData: FormData) {
  const { photoPersistence } = await context();
  const file = formData.get("photo");
  if (!(file instanceof File)) redirect("/provider/account?photo=invalid");
  const result = await submitProviderPhoto(
    {
      providerId: String(formData.get("providerId") ?? ""),
      file,
      consentAttested: formData.get("consentAttested") === "yes"
    },
    photoPersistence
  );
  revalidatePath("/provider/account");
  redirect(`/provider/account?photo=${result.ok ? "submitted" : "invalid"}`);
}

export async function providerSignOutAction() {
  await signOutProviderSession();
  redirect("/provider/login");
}
