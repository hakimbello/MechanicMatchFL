"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "../../../src/supabase/browserClient.ts";
import { completeAdminLoginAction } from "./actions";

export function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (signInError) {
        setError("Could not sign in with those credentials.");
        return;
      }

      const authorization = await completeAdminLoginAction();
      if (!authorization.ok) {
        await supabase.auth.signOut();
        setError(
          authorization.error === "missing-config"
            ? "Admin login is temporarily unavailable."
            : "Could not sign in with those credentials."
        );
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Admin login is temporarily unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="submission-form" onSubmit={handleSubmit} noValidate>
      <section className="form-section" aria-labelledby="admin-login-title">
        <h2 id="admin-login-title">Administrator sign in</h2>
        <div className="field-group">
          <label htmlFor="admin-email">Email</label>
          <input
            autoComplete="email"
            id="admin-email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div className="field-group">
          <label htmlFor="admin-password">Password</label>
          <input
            autoComplete="current-password"
            id="admin-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="primary-action" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
        <Link className="provider-entry-link standalone-link" href="/admin/forgot-password">
          Forgot password?
        </Link>
      </section>
    </form>
  );
}
