import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactActions } from "./contact-actions";
import { ProfileAnalytics } from "./profile-analytics";
import {
  buildProviderProfileView,
} from "../../../src/profiles/providerProfiles.ts";
import {
  getRuntimePublicProviderById
} from "../../../src/providers/runtimeProviderPersistence.ts";
import {
  buildMechanicProfileMetadata,
  buildMechanicProfileNotFoundMetadata
} from "../../../src/seo/metadata.ts";
import { buildProviderStructuredData, serializeJsonLd } from "../../../src/seo/structuredData.ts";

type MechanicProfilePageProps = {
  params: Promise<{ providerId: string }>;
  searchParams: Promise<{
    service?: string;
    make?: string;
    zip?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: MechanicProfilePageProps): Promise<Metadata> {
  const { providerId } = await params;
  const provider = await getRuntimePublicProviderById(providerId);

  if (!provider) {
    return buildMechanicProfileNotFoundMetadata();
  }

  return buildMechanicProfileMetadata(provider);
}

export default async function MechanicProfilePage({ params, searchParams }: MechanicProfilePageProps) {
  const { providerId } = await params;
  const context = await searchParams;
  const provider = await getRuntimePublicProviderById(providerId);

  if (!provider) {
    notFound();
  }

  const profile = buildProviderProfileView(provider, {
    serviceCategory: context.service,
    make: context.make,
    zip: context.zip
  });
  const structuredData = buildProviderStructuredData(provider);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <ProfileAnalytics
        providerId={provider.id}
        providerType={provider.type}
        serviceCategory={profile.matchContext?.serviceCategory}
      />
      <main className="page-shell profile-shell">
        <Link className="back-link" href="/">
          Back to Search
        </Link>

        <section className="profile-hero" aria-labelledby="profile-title">
          <div>
            <p className="eyebrow">{profile.providerType}</p>
            <h1 id="profile-title">{profile.name}</h1>
            <p className="intro">{profile.description}</p>
            <div className="profile-badges" aria-label="Provider trust and location details">
              <span>{profile.locationKind}</span>
              {profile.verified ? <span>Verified profile</span> : null}
              {profile.claimedProfile ? <span>Claimed profile</span> : null}
            </div>
          </div>

          <ContactActions
            actions={profile.contactActions}
            eventContext={{
              providerId: profile.id,
              sourcePage: "profile",
              serviceCategory: profile.matchContext?.serviceCategory
            }}
          />
        </section>

        {profile.matchContext ? (
          <section className="profile-card" aria-labelledby="match-context-title">
            <h2 id="match-context-title">Why this mechanic matched</h2>
            <dl className="detail-list">
              {profile.matchContext.serviceLine ? (
                <>
                  <dt>Matched for</dt>
                  <dd>{profile.matchContext.serviceLine}</dd>
                </>
              ) : null}
              {profile.matchContext.vehicleLine ? (
                <>
                  <dt>Works on</dt>
                  <dd>{profile.matchContext.vehicleLine}</dd>
                </>
              ) : null}
              {profile.matchContext.locationLine ? (
                <>
                  <dt>Location</dt>
                  <dd>{profile.matchContext.locationLine}</dd>
                </>
              ) : null}
            </dl>
          </section>
        ) : null}

        <section className="profile-grid" aria-label="Provider details">
          <div className="profile-card">
            <h2>Location</h2>
            <p>{profile.locationLine}</p>
            {profile.serviceAreaLine ? <p className="muted-text">{profile.serviceAreaLine}</p> : null}
          </div>

          <div className="profile-card">
            <h2>Services</h2>
            <ul className="profile-list">
              {profile.services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </div>

          <div className="profile-card">
            <h2>Vehicles</h2>
            <p>{profile.makesLine}</p>
            {profile.specialtyMakesLine ? <p className="muted-text">{profile.specialtyMakesLine}</p> : null}
          </div>
        </section>
      </main>
    </>
  );
}
