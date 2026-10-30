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
import { formatMessage, getPublicMessages } from "../../../src/i18n/messages.ts";
import { localizePublicPath, type PublicLocale } from "../../../src/i18n/locale.ts";

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
  return generateLocalizedMetadata({ params }, "en");
}

export async function generateLocalizedMetadata({ params }: Pick<MechanicProfilePageProps, "params">, locale: PublicLocale): Promise<Metadata> {
  const { providerId } = await params;
  const provider = await getRuntimePublicProviderById(providerId);

  if (!provider) {
    return buildMechanicProfileNotFoundMetadata(locale);
  }

  return buildMechanicProfileMetadata(provider, locale);
}

export default async function MechanicProfilePage({ params, searchParams }: MechanicProfilePageProps) {
  return renderMechanicProfilePage({ params, searchParams }, "en");
}

export async function renderMechanicProfilePage({ params, searchParams }: MechanicProfilePageProps, locale: PublicLocale) {
  const { providerId } = await params;
  const context = await searchParams;
  const provider = await getRuntimePublicProviderById(providerId);

  if (!provider) {
    notFound();
  }

  const messages = getPublicMessages(locale);
  const profile = buildProviderProfileView(provider, {
    serviceCategory: context.service,
    make: context.make,
    zip: context.zip
  }, locale);
  const structuredData = buildProviderStructuredData(provider, locale);
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
        <Link className="back-link" href={localizePublicPath("/", locale)}>
          {messages.profile.back}
        </Link>

        <section className="profile-hero" aria-labelledby="profile-title">
          <div className="profile-identity">
            {publicPhoto ? <img className="provider-profile-photo" src={`/provider-photos/${encodeURIComponent(provider.id)}`} width={publicPhoto.width} height={publicPhoto.height} alt={formatMessage(messages.profile.photoAlt, { name: profile.name })} /> : null}
            <div>
              <p className="eyebrow">{profile.providerType}</p>
              <h1 id="profile-title">{profile.name}</h1>
              <p className="intro">{profile.description}</p>
              <div className="profile-badges" aria-label={messages.profile.trustLabel}>
                <span>{profile.locationKind}</span>
                {profile.verified ? <span>{messages.profile.verified}</span> : null}
                {profile.claimedProfile ? <span>{messages.profile.claimed}</span> : null}
              </div>
            </div>
          </div>

          <ContactActions
            actions={profile.contactActions}
            locale={locale}
            eventContext={{
              providerId: profile.id,
              sourcePage: "profile",
              serviceCategory: profile.matchContext?.serviceCategory
            }}
          />
        </section>

        {profile.matchContext ? (
          <section className="profile-card" aria-labelledby="match-context-title">
            <h2 id="match-context-title">{messages.profile.whyMatched}</h2>
            <dl className="detail-list">
              {profile.matchContext.serviceLine ? (
                <>
                  <dt>{messages.profile.matchedFor}</dt>
                  <dd>{profile.matchContext.serviceLine}</dd>
                </>
              ) : null}
              {profile.matchContext.vehicleLine ? (
                <>
                  <dt>{messages.profile.worksOn}</dt>
                  <dd>{profile.matchContext.vehicleLine}</dd>
                </>
              ) : null}
              {profile.matchContext.locationLine ? (
                <>
                  <dt>{messages.profile.location}</dt>
                  <dd>{profile.matchContext.locationLine}</dd>
                </>
              ) : null}
            </dl>
          </section>
        ) : null}

        <section className="profile-grid" aria-label={messages.profile.detailsLabel}>
          <div className="profile-card">
            <h2>{messages.profile.location}</h2>
            <p>{profile.locationLine}</p>
            {profile.serviceAreaLine ? <p className="muted-text">{profile.serviceAreaLine}</p> : null}
          </div>

          <div className="profile-card">
            <h2>{messages.profile.services}</h2>
            <ul className="profile-list">
              {profile.services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </div>

          <div className="profile-card">
            <h2>{messages.profile.vehicles}</h2>
            <p>{profile.makesLine}</p>
            {profile.specialtyMakesLine ? <p className="muted-text">{profile.specialtyMakesLine}</p> : null}
          </div>

          {(profile.experienceLine || profile.languagesLine) ? (
            <div className="profile-card">
              <h2>{messages.profile.details}</h2>
              {profile.experienceLine ? <p>{profile.experienceLine}</p> : null}
              {profile.languagesLine ? <p>{profile.languagesLine}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="profile-card review-section" aria-labelledby="customer-reviews-title">
          <div className="review-heading">
            <div>
              <p className="eyebrow">{messages.profile.feedback}</p>
              <h2 id="customer-reviews-title">{messages.profile.reviews}</h2>
            </div>
            {reviewAggregate ? (
              <p className="review-summary" aria-label={formatMessage(messages.profile.starsSummary, { rating: reviewAggregate.averageRating.toFixed(1), count: reviewAggregate.reviewCount })}>
                <strong>{reviewAggregate.averageRating.toFixed(1)} / 5</strong>
                <span>{reviewAggregate.reviewCount} {reviewAggregate.reviewCount === 1 ? messages.profile.review : messages.profile.reviewsPlural}</span>
              </p>
            ) : null}
          </div>

          {!reviewsAvailable ? <p className="muted-text">{messages.profile.reviewsUnavailable}</p> : null}
          {reviewsAvailable && reviews.length === 0 ? <p className="muted-text">{messages.profile.noReviews}</p> : null}
          {reviews.length ? (
            <div className="review-list">
              {reviews.map((review) => (
                <article className="public-review" key={review.id}>
                  <header>
                    <strong>{review.reviewerName}</strong>
                    <span>{formatMessage(messages.profile.stars, { rating: review.rating })}</span>
                  </header>
                  <p>{review.reviewText}</p>
                  <p className="review-verification-label">{messages.profile.verification}</p>
                  {review.providerResponse ? (
                    <div className="provider-response">
                      <strong>{messages.profile.providerResponse}</strong>
                      <p>{review.providerResponse}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="profile-card" aria-labelledby="write-review-title">
          <h2 id="write-review-title">{messages.profile.writeReview}</h2>
          <p className="muted-text">{messages.profile.reviewIntro}</p>
          <ReviewSubmissionForm providerId={provider.id} locale={locale} />
        </section>

        <section className="profile-card" aria-labelledby="provider-tools-title">
          <h2 id="provider-tools-title">{messages.profile.providerTools}</h2>
          <p className="muted-text">{messages.profile.toolsHelp}</p>
          <div className="admin-actions">
            <Link className="secondary-action admin-action-button" href={`/provider/account?providerId=${encodeURIComponent(provider.id)}`}>{messages.profile.claimProvider}</Link>
            <Link className="secondary-action admin-action-button" href={`${localizePublicPath("/safety/report", locale)}?providerId=${encodeURIComponent(provider.id)}`}>{messages.profile.reportSafety}</Link>
          </div>
        </section>
      </main>
    </>
  );
}
