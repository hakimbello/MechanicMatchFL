import type { Metadata } from "next";

import { getPublicMessages } from "../../../../src/i18n/messages.ts";
import { localeAlternates } from "../../../../src/i18n/locale.ts";
import { renderSafetyReportPage } from "../../../safety/report/page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: getPublicMessages("es").metadata.safetyTitle,
  alternates: { ...localeAlternates("/safety/report"), canonical: "/es/safety/report" },
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default function SpanishSafetyReportPage({ searchParams }: { searchParams: Promise<{ providerId?: string }> }) {
  return renderSafetyReportPage(searchParams, "es");
}
