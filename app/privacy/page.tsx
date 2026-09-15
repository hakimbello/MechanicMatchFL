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
          policy will need to be updated before production launch as storage, admin access, and provider
          workflows mature.
        </p>
      </section>

      <section className="profile-card">
        <h2>Customer Searches</h2>
        <p>
          Drivers can enter vehicle year, make, model, repair or service category, and ZIP code to find
          relevant mechanics. The current search runs in the app against development provider data. Search
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
          shop or mobile service area, description, optional image reference, optional registration
          information, and authorization information for review.
        </p>
        <p>
          During this development milestone, provider submissions are stored in the submitting browser
          through temporary local storage, with an in-memory fallback for development. This is not
          production storage and may include provider contact details and business location details.
          Durable server-side persistence is a production blocker.
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
          Before launch, MechanicMatchFL still needs production admin authentication, durable provider
          storage, final domain configuration, Vercel analytics verification, and a real privacy contact
          mechanism if one is required. No privacy contact email or mailing address is listed here because
          one has not been established yet.
        </p>
      </section>
    </main>
  );
}
