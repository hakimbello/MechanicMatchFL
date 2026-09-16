import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How MechanicMatchFL handles search, provider submission, and analytics data in the current MVP.",
  alternates: {
    canonical: "/privacy"
  }
};

export default function PrivacyPage() {
  return (
    <main className="page-shell privacy-page">
      <Link className="back-link" href="/">
        Back to Search
      </Link>

      <section className="profile-card">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy at MechanicMatchFL</h1>
        <p className="intro">
          This page describes the current MVP behavior. MechanicMatchFL is still in development, so this
          policy will need to be updated before production launch as hosting, verification, and provider
          operations mature.
        </p>
      </section>

      <section className="profile-card">
        <h2>Customer Searches</h2>
        <p>
          Drivers can enter vehicle year, make, model, repair or service category, and ZIP code to find
          relevant mechanics. The current search runs in the app against active public provider data. Search
          state may appear in profile links as service, make, and ZIP context so the profile can explain
          why a mechanic matched.
        </p>
        <p>
          Customer search inputs are not currently stored in a production database. Analytics events use
          only low-risk product fields, such as service category, vehicle make, coarse launch area, and
          result count. We do not intentionally send raw ZIP codes, names, phone numbers, emails, vehicle
          model, VINs, or free-form customer messages to analytics.
        </p>
      </section>

      <section className="profile-card">
        <h2>Provider Submissions</h2>
        <p>
          Providers can submit business name, phone, email, provider type, services, vehicle compatibility,
          shop or mobile service area, description, optional registration information, and authorization
          information for review. Provider images are deferred from V1 and are not collected by the current
          submission form.
        </p>
        <p>
          Provider submissions are sent through a server-side validation boundary before durable storage.
          The production path stores submissions in Supabase provider records for administrator review.
          Local development and tests may use isolated non-production storage so ordinary tests do not
          require live production secrets.
        </p>
        <p>
          Public mechanic profiles should show only intended business information for active public
          providers. Authorization relationship, authorization attestation, internal review status, and
          submitted-unverified registration details are not intended public profile fields.
        </p>
      </section>

      <section className="profile-card">
        <h2>Analytics</h2>
        <p>
          MechanicMatchFL uses Vercel Web Analytics to understand whether the MVP funnel works: search,
          results, profile views, mechanic contact clicks, and provider submission completion.
        </p>
        <p>
          Analytics is for product validation, not surveillance. We do not intentionally send provider
          phone numbers, provider emails, street addresses, registration numbers, authorization text, full
          form payloads, raw customer ZIP codes, or arbitrary query-string contents as analytics
          properties.
        </p>
      </section>

      <section className="profile-card">
        <h2>Contact Links</h2>
        <p>
          Mechanic profiles may include phone, email, or website links. Using those links can open your
          phone app, email app, or the provider's website. Those external services are outside the current
          MechanicMatchFL app.
        </p>
      </section>

      <section className="profile-card">
        <h2>Production Updates</h2>
        <p>
          Before launch, MechanicMatchFL still needs live integration verification, final domain
          configuration, Vercel analytics verification, accountless-submission abuse hardening decisions,
          and a real privacy contact mechanism if one is required. No privacy contact email or mailing
          address is listed here because one has not been established yet.
        </p>
      </section>
    </main>
  );
}
