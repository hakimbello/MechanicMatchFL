"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerAuthClient } from "../../../src/supabase/serverClient.ts";

function credentials(formData: FormData) {
  return { email: String(formData.get("email") ?? "").trim().toLowerCase(), password: String(formData.get("password") ?? "") };
}

export async function providerSignInAction(formData: FormData) {
  const input = credentials(formData);
  if (!input.email || input.password.length < 12) redirect("/provider/login?error=invalid");
  const client = await createSupabaseServerAuthClient();
  const { error } = await client.auth.signInWithPassword(input);
  if (error) redirect("/provider/login?error=invalid");
  redirect("/provider/account");
}

export async function providerSignUpAction(formData: FormData) {
  const input = credentials(formData);
  if (!input.email || input.password.length < 12) redirect("/provider/login?error=invalid");
  const client = await createSupabaseServerAuthClient();
  await client.auth.signUp(input);
  redirect("/provider/login?created=1");
}
