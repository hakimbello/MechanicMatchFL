import Link from "next/link";
import type { Metadata } from "next";

import { providerSignInAction, providerSignUpAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Provider Sign In | MechanicMatchFL", robots: { index: false, follow: false } };

export default async function ProviderLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const query = await searchParams;
  return (
    <main className="page-shell provider-flow">
      <Link className="back-link" href="/">Back to Search</Link>
      <section className="profile-card">
        <p className="eyebrow">Provider account</p>
        <h1>Provider sign in</h1>
        <p className="intro">An account does not establish ownership. Every provider claim requires administrator approval.</p>
        {query.error ? <p className="field-error" role="alert">Sign-in or account creation could not be completed.</p> : null}
        {query.created ? <p className="confirmation-panel">Check your email if confirmation is required, then sign in.</p> : null}
        <form className="submission-form" action={providerSignInAction}>
          <div className="field-group"><label htmlFor="provider-email">Email</label><input id="provider-email" name="email" type="email" autoComplete="email" required /></div>
          <div className="field-group"><label htmlFor="provider-password">Password</label><input id="provider-password" name="password" type="password" autoComplete="current-password" minLength={12} required /></div>
          <div className="admin-actions">
            <button className="primary-action" type="submit">Sign In</button>
            <button className="secondary-action admin-action-button" formAction={providerSignUpAction} type="submit">Create Account</button>
          </div>
        </form>
      </section>
    </main>
  );
}
