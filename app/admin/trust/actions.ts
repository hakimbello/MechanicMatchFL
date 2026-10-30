"use server";

import { revalidatePath } from "next/cache";

import { getAdminAuthorization } from "../../../src/admin/adminAuth.ts";
import { getPhotoPersistenceForRuntime } from "../../../src/photos/runtimePhotoPersistence.ts";
import { createSupabaseServerAuthClient } from "../../../src/supabase/serverClient.ts";
import { getTrustPersistenceForRuntime } from "../../../src/trust/runtimeTrustPersistence.ts";

async function persistence() {
  const authorization = await getAdminAuthorization();
  if (!authorization.ok) throw new Error("Unauthorized");
  return getTrustPersistenceForRuntime(await createSupabaseServerAuthClient());
}

async function photoPersistence() {
  const authorization = await getAdminAuthorization();
  if (!authorization.ok) throw new Error("Unauthorized");
  return getPhotoPersistenceForRuntime(await createSupabaseServerAuthClient());
}

const value = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

export async function reviewClaimAction(data: FormData) { await (await persistence()).reviewClaim(value(data,"id"), value(data,"decision") as "approved"|"rejected"|"disabled"|"revoked", value(data,"reason")); revalidatePath("/admin/trust"); }
export async function moderateResponseAction(data: FormData) { await (await persistence()).moderateResponse(value(data,"id"), value(data,"decision") as "approved"|"rejected", value(data,"reason")); revalidatePath("/admin/trust"); }
export async function updateDisputeAction(data: FormData) { await (await persistence()).updateDispute(value(data,"id"), value(data,"status") as "reviewing"|"resolved"|"dismissed", value(data,"reason")); revalidatePath("/admin/trust"); }
export async function updateSafetyAction(data: FormData) { await (await persistence()).updateSafetyIncident(value(data,"id"), value(data,"status") as "investigating"|"resolved"|"dismissed", value(data,"reason")); revalidatePath("/admin/trust"); }
export async function suspensionAction(data: FormData) { const p=await persistence(); const action=value(data,"action"); if(action==="suspend") await p.suspendProvider(value(data,"providerId"),value(data,"reason")); else await p.reinstateProvider(value(data,"providerId"),value(data,"reason")); revalidatePath("/admin/trust"); }
export async function decideAppealAction(data: FormData) { await (await persistence()).decideAppeal(value(data,"id"), value(data,"decision") as "granted"|"upheld"|"closed", value(data,"reason")); revalidatePath("/admin/trust"); }
export async function moderatePhotoAction(data: FormData) { await (await photoPersistence()).moderatePhoto(value(data,"id"), value(data,"decision") as "approved"|"rejected", value(data,"reason")); revalidatePath("/admin/trust"); }
export async function removePhotoAction(data: FormData) { await (await photoPersistence()).removePhoto(value(data,"id"), value(data,"reason")); revalidatePath("/admin/trust"); }
