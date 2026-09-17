import type { Metadata } from "next";
import Link from "next/link";

import { getAdminAuthorization } from "../../../src/admin/adminAuth.ts";
import { ADMIN_PASSWORD_RECOVERY_REQUEST_PATH } from "../../../src/admin/passwordRecovery.ts";
import { RecoveryPasswordForm } from "./recovery-password-form";

export const metadata: Metadata = {
  title: "Set New Admin Password",
  robots: {
    index: false,
    follow: false
  }
};
export const dynamic = "force-dynamic";

type AdminRecoveryPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminRecoveryPage({ searchParams }: AdminRecoveryPageProps) {
  const { error } = await searchParams;
  const authorization = error ? null : await getAdminAuthorization();

  if (error === "invalid-link" || !authorization?.ok) {
    return (
      <main className="page-shell provider-flow">
        <section className="confirmation-panel error-panel">
          <h1>Reset link unavailable</h1>
          <p>This password reset link is invalid or has expired. Request a new link to continue.</p>
          <Link className="secondary-action" href={ADMIN_PASSWORD_RECOVERY_REQUEST_PATH}>
            Request Another Reset Link
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell provider-flow">
      <section className="profile-card">
        <p className="eyebrow">Admin recovery</p>
        <h1>Set a new password</h1>
        <p className="intro">Choose a new password for your existing administrator account.</p>
      </section>
      <RecoveryPasswordForm />
    </main>
  );
}
