import type { Metadata } from "next";

import { getPublicMessages } from "../../../../src/i18n/messages.ts";
import { renderVerifyReviewPage } from "../../../reviews/verify/page";

export const metadata: Metadata = {
  title: getPublicMessages("es").metadata.verificationTitle,
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default function SpanishVerifyReviewPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return renderVerifyReviewPage(searchParams, "es");
}
