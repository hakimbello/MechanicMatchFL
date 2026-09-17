import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Admin Password",
  robots: {
    index: false,
    follow: false
  }
};

export default function ForgotPasswordPage() {
  return (
    <main className="page-shell provider-flow">
      <Link className="back-link" href="/admin/login">
        Back to Admin Login
      </Link>
      <section className="profile-card">
        <p className="eyebrow">Admin</p>
        <h1>Reset your password</h1>
        <p className="intro">Enter the email address for your existing administrator account.</p>
      </section>
      <ForgotPasswordForm />
    </main>
  );
}
