import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactActions } from "./contact-actions";
import { ProfileAnalytics } from "./profile-analytics";
import { ReviewSubmissionForm } from "./review-submission-form";
import {
  buildProviderProfileView,
} from "../../../src/profiles/providerProfiles.ts";
import {
  getRuntimePublicProviderById
} from "../../../src/providers/runtimeProviderPersistence.ts";
import { getPhotoPersistenceForRuntime } from "../../../src/photos/runtimePhotoPersistence.ts";
import type { PublicProviderPhoto } from "../../../src/photos/photoTypes.ts";
import {
  buildMechanicProfileMetadata,
  buildMechanicProfileNotFoundMetadata
} from "../../../src/seo/metadata.ts";
import { buildProviderStructuredData, serializeJsonLd } from "../../../src/seo/structuredData.ts";
import { getPublicReviewPersistenceForRuntime } from "../../../src/reviews/runtimeReviewPersistence.ts";
import type { PublicReview, PublicReviewAggregate } from "../../../src/reviews/reviewTypes.ts";

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
  let reviews: PublicReview[] = [];
  let reviewAggregate: PublicReviewAggregate | null = null;
  let publicPhoto: PublicProviderPhoto | null = null;
  let reviewsAvailable = true;
  try {
    const reviewPersistence = getPublicReviewPersistenceForRuntime();
    [reviews, reviewAggregate] = await Promise.all([
      reviewPersistence.listPublicReviews(provider.id),
      reviewPersistence.getPublicReviewAggregate(provider.id)
    ]);
  } catch {
    reviewsAvailable = false;
  }
  try {
    publicPhoto = await getPhotoPersistenceForRuntime().getPublicPhoto(provider.id);
  } catch {
    publicPhoto = null;
  }

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
          <div className="profile-identity">
            {publicPhoto ? <img className="provider-profile-photo" src={`/provider-photos/${encodeURIComponent(provider.id)}`} width={publicPhoto.width} height={publicPhoto.height} alt={`${profile.name} provider photo`} /> : null}
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

          {(profile.experienceLine || profile.languagesLine) ? (
            <div className="profile-card">
              <h2>Provider details</h2>
              {profile.experienceLine ? <p>{profile.experienceLine}</p> : null}
              {profile.languagesLine ? <p>{profile.languagesLine}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="profile-card review-section" aria-labelledby="customer-reviews-title">
          <div className="review-heading">
            <div>
              <p className="eyebrow">Customer feedback</p>
              <h2 id="customer-reviews-title">Reviews</h2>
            </div>
            {reviewAggregate ? (
              <p className="review-summary" aria-label={`${reviewAggregate.averageRating.toFixed(1)} out of 5 stars from ${reviewAggregate.reviewCount} reviews`}>
                <strong>{reviewAggregate.averageRating.toFixed(1)} / 5</strong>
                <span>{reviewAggregate.reviewCount} {reviewAggregate.reviewCount === 1 ? "review" : "reviews"}</span>
              </p>
            ) : null}
          </div>

          {!reviewsAvailable ? <p className="muted-text">Reviews are temporarily unavailable.</p> : null}
          {reviewsAvailable && reviews.length === 0 ? <p className="muted-text">No published reviews yet.</p> : null}
          {reviews.length ? (
            <div className="review-list">
              {reviews.map((review) => (
                <article className="public-review" key={review.id}>
                  <header>
                    <strong>{review.reviewerName}</strong>
                    <span>{review.rating} / 5 stars</span>
                  </header>
                  <p>{review.reviewText}</p>
                  <p className="review-verification-label">Email ownership verified. Service not independently verified.</p>
                  {review.providerResponse ? (
                    <div className="provider-response">
                      <strong>Provider response</strong>
                      <p>{review.providerResponse}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="profile-card" aria-labelledby="write-review-title">
          <h2 id="write-review-title">Write a review</h2>
          <p className="muted-text">Reviews require email ownership verification and administrator approval before publication.</p>
          <ReviewSubmissionForm providerId={provider.id} />
        </section>

        <section className="profile-card" aria-labelledby="provider-tools-title">
          <h2 id="provider-tools-title">Provider and safety tools</h2>
          <p className="muted-text">Provider ownership claims require administrator approval. Safety reports are confidential.</p>
          <div className="admin-actions">
            <Link className="secondary-action admin-action-button" href={`/provider/account?providerId=${encodeURIComponent(provider.id)}`}>Claim This Provider</Link>
            <Link className="secondary-action admin-action-button" href={`/safety/report?providerId=${encodeURIComponent(provider.id)}`}>Report a Safety Incident</Link>
          </div>
        </section>
      </main>
    </>
  );
}
