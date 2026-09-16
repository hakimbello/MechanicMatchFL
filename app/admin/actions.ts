"use server";

import { redirect } from "next/navigation";

import { signOutAdminSession } from "../../src/admin/adminAuth.ts";

export async function signOutAdminAction() {
  await signOutAdminSession();
  redirect("/admin/login");
}
