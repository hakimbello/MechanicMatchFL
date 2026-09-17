import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminAuthorization } from "../../../src/admin/adminAuth.ts";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  }
};
export const dynamic = "force-dynamic";

type AdminLoginPageProps = {
  searchParams: Promise<{ next?: string; reset?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { next, reset } = await searchParams;
  const nextPath = normalizeAdminNextPath(next);
  const authorization = await getAdminAuthorization();

  if (authorization.ok) {
    redirect(nextPath);
  }

  return (
    <main className="page-shell provider-flow">
      <Link className="back-link" href="/">
        Back to Search
      </Link>
      <section className="profile-card">
        <p className="eyebrow">Admin</p>
        <h1>Provider review access</h1>
        <p className="intro">Sign in with an authorized MechanicMatchFL administrator account.</p>
      </section>
      {reset === "success" ? (
        <section className="confirmation-panel" aria-live="polite">
          <h2>Password updated</h2>
          <p>Sign in with your new password.</p>
        </section>
      ) : null}
      <AdminLoginForm nextPath={nextPath} />
    </main>
  );
}

function normalizeAdminNextPath(value?: string): string {
  if (!value?.startsWith("/admin/providers")) {
    return "/admin/providers";
  }

  return value;
}
