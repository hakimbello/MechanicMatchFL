import type { Metadata } from "next";
import Link from "next/link";

import { VerificationTokenForm } from "./verification-token-form";

export const metadata: Metadata = {
  title: "Verify review email",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default async function VerifyReviewPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const message = statusMessage(status);
  return (
    <main className="page-shell provider-flow">
      <Link className="back-link" href="/">Back to Search</Link>
      <section className="profile-card">
        <p className="eyebrow">Customer review</p>
        <h1>Verify your email</h1>
        {message ? <p className="intro" role="status">{message}</p> : (
          <>
            <p className="intro">Confirm email ownership to place your unpublished review in the moderation queue.</p>
            <p className="muted-text">This confirms email ownership only. It does not verify a purchase, completed repair, or service relationship.</p>
            <VerificationTokenForm />
          </>
        )}
      </section>
    </main>
  );
}

function statusMessage(status?: string): string | null {
  if (status === "verified") return "Email ownership verified. Your review is unpublished and awaiting administrator moderation.";
  if (status === "expired") return "This verification link has expired. The review was not published.";
  if (status === "used") return "This single-use verification link has already been used.";
  if (status === "invalid") return "This verification link is invalid. The review was not published.";
  return null;
}
