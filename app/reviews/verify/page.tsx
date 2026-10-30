import type { Metadata } from "next";
import Link from "next/link";

import { VerificationTokenForm } from "./verification-token-form";
import { getPublicMessages } from "../../../src/i18n/messages.ts";
import { localeAlternates, localizePublicPath, type PublicLocale } from "../../../src/i18n/locale.ts";

export const metadata: Metadata = {
  title: "Verify review email",
  alternates: localeAlternates("/reviews/verify"),
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default async function VerifyReviewPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return renderVerifyReviewPage(searchParams, "en");
}

export async function renderVerifyReviewPage(searchParams: Promise<{ status?: string }>, locale: PublicLocale) {
  const { status } = await searchParams;
  const messages = getPublicMessages(locale).verification;
  const message = statusMessage(status, locale);
  return (
    <main className="page-shell provider-flow">
      <Link className="back-link" href={localizePublicPath("/", locale)}>{getPublicMessages(locale).profile.back}</Link>
      <section className="profile-card">
        <p className="eyebrow">{messages.eyebrow}</p>
        <h1>{messages.title}</h1>
        {message ? <p className="intro" role="status">{message}</p> : (
          <>
            <p className="intro">{messages.intro}</p>
            <VerificationTokenForm locale={locale} />
          </>
        )}
      </section>
    </main>
  );
}

function statusMessage(status: string | undefined, locale: PublicLocale): string | null {
  const messages = getPublicMessages(locale).verification;
  if (status === "verified") return `${messages.verifiedTitle}. ${messages.verifiedBody}`;
  if (status === "expired") return `${messages.expiredTitle}. ${messages.expiredBody}`;
  if (status === "used") return `${messages.usedTitle}. ${messages.usedBody}`;
  if (status === "invalid") return `${messages.invalidTitle}. ${messages.invalidBody}`;
  return null;
}
