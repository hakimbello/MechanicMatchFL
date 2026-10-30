import Link from "next/link";
import type { Metadata } from "next";
import { SafetyReportForm } from "./safety-report-form";
import { getPublicMessages } from "../../../src/i18n/messages.ts";
import { localizePublicPath, type PublicLocale } from "../../../src/i18n/locale.ts";

export const metadata: Metadata = {
  title: getPublicMessages("en").metadata.safetyTitle,
  alternates: { canonical: "/safety/report", languages: { "en-US": "/safety/report", "es-US": "/es/safety/report", "x-default": "/safety/report" } },
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export const dynamic = "force-dynamic";

export default async function SafetyReportPage({ searchParams }: { searchParams: Promise<{ providerId?: string }> }) {
  return renderSafetyReportPage(searchParams, "en");
}

export async function renderSafetyReportPage(searchParams: Promise<{ providerId?: string }>, locale: PublicLocale) {
  const query = await searchParams;
  const messages = getPublicMessages(locale);
  return <main className="page-shell provider-flow"><Link className="back-link" href={localizePublicPath("/", locale)}>{messages.profile.back}</Link><section className="profile-card"><p className="eyebrow">{messages.safety.eyebrow}</p><h1>{messages.safety.title}</h1><p className="intro">{messages.safety.intro}</p></section><section className="profile-card"><SafetyReportForm providerId={query.providerId} locale={locale} /></section></main>;
}
