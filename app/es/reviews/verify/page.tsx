import type { Metadata } from "next";

import { getPublicMessages } from "../../../../src/i18n/messages.ts";
import { localeAlternates } from "../../../../src/i18n/locale.ts";
import { renderVerifyReviewPage } from "../../../reviews/verify/page";

export const metadata: Metadata = {
  title: getPublicMessages("es").metadata.verificationTitle,
  alternates: { ...localeAlternates("/reviews/verify"), canonical: "/es/reviews/verify" },
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default function SpanishVerifyReviewPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return renderVerifyReviewPage(searchParams, "es");
}
