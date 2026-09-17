"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  PASSWORD_RESET_REQUEST_CONFIRMATION,
  buildAdminRecoveryCallbackUrl
} from "../../../src/admin/passwordRecovery.ts";
import { createSupabaseBrowserClient } from "../../../src/supabase/browserClient.ts";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: buildAdminRecoveryCallbackUrl(window.location.origin)
      });
    } catch {
      // The response stays generic so account existence and provider errors are not disclosed.
    } finally {
      setEmail("");
      setIsComplete(true);
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <section className="confirmation-panel" aria-live="polite">
        <h2>Check your email</h2>
        <p>{PASSWORD_RESET_REQUEST_CONFIRMATION}</p>
        <Link className="secondary-action" href="/admin/login">
          Return to Admin Login
        </Link>
      </section>
    );
  }

  return (
    <form className="submission-form" onSubmit={handleSubmit} noValidate>
      <section className="form-section" aria-labelledby="password-reset-request-title">
        <h2 id="password-reset-request-title">Send reset link</h2>
        <div className="field-group">
          <label htmlFor="recovery-email">Email</label>
          <input
            autoComplete="email"
            id="recovery-email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <button className="primary-action" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </button>
      </section>
    </form>
  );
}
