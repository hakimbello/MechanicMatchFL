import Link from "next/link";
import { SafetyReportForm } from "./safety-report-form";

export const dynamic = "force-dynamic";

export default async function SafetyReportPage({ searchParams }: { searchParams: Promise<{ providerId?: string }> }) {
  const query = await searchParams;
  return <main className="page-shell provider-flow"><Link className="back-link" href="/">Back to Search</Link><section className="profile-card"><p className="eyebrow">Private safety channel</p><h1>Report a safety incident</h1><p className="intro">Reports and allegations are confidential by default. Submitting a report does not automatically suspend or remove a provider.</p></section><section className="profile-card"><SafetyReportForm providerId={query.providerId} /></section></main>;
}
