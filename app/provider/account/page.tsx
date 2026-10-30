import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getProviderAuthentication } from "../../../src/providers/providerAuth.ts";
import { getPhotoPersistenceForRuntime } from "../../../src/photos/runtimePhotoPersistence.ts";
import { createSupabaseServerAuthClient } from "../../../src/supabase/serverClient.ts";
import { getTrustPersistenceForRuntime } from "../../../src/trust/runtimeTrustPersistence.ts";
import { providerSignOutAction, submitAppealAction, submitClaimAction, submitDisputeAction, submitPhotoAction, submitResponseAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Provider Account | MechanicMatchFL", robots: { index: false, follow: false } };

export default async function ProviderAccountPage({ searchParams }: { searchParams: Promise<{ providerId?: string; photo?: string }> }) {
  const authentication = await getProviderAuthentication();
  if (!authentication.ok && authentication.reason === "unauthenticated") redirect("/provider/login");
  if (!authentication.ok) return <Unavailable />;
  const query = await searchParams;
  try {
    const client = await createSupabaseServerAuthClient();
    const [workspace, photoWorkspace] = await Promise.all([
      getTrustPersistenceForRuntime(client).getProviderWorkspace(authentication.user.userId),
      getPhotoPersistenceForRuntime(client).getProviderWorkspace(authentication.user.userId)
    ]);
    const approvedClaims = workspace.claims.filter((claim) => claim.status === "approved");
    return (
      <main className="page-shell provider-flow">
        <Link className="back-link" href="/">Back to Search</Link>
        <section className="profile-card">
          <p className="eyebrow">Provider account</p><h1>Ownership and review tools</h1>
          <p className="intro">Claims, replies, disputes, and appeals remain private until the applicable administrator decision.</p>
          <form action={providerSignOutAction}><button className="secondary-action" type="submit">Sign Out</button></form>
        </section>

        <section className="profile-card"><h2>Request ownership review</h2>
          <form className="submission-form" action={submitClaimAction}>
            <div className="field-group"><label htmlFor="claim-provider">Provider ID</label><input id="claim-provider" name="providerId" defaultValue={query.providerId ?? ""} required /></div>
            <div className="field-group"><label htmlFor="claim-evidence">Private ownership evidence</label><textarea id="claim-evidence" name="evidence" minLength={30} maxLength={2000} rows={5} required /><p className="field-help">Describe evidence an administrator can independently evaluate. It is never published.</p></div>
            <button className="primary-action" type="submit">Submit Claim</button>
          </form>
          {workspace.claims.map((claim) => <p className="muted-text" key={claim.id}>Provider {claim.providerId}: {claim.status}</p>)}
        </section>

        {approvedClaims.length ? <>
          <section className="profile-card"><h2>Provider photo</h2>
            <p className="muted-text">JPEG, PNG, or WebP; 4 MB maximum. Photos are normalized and remain private until administrator approval. An approved photo stays public while a replacement is reviewed.</p>
            {query.photo === "submitted" ? <p role="status">Photo submitted for administrator review.</p> : null}
            {query.photo === "invalid" ? <p role="alert">The photo could not be accepted. Check the file and try again.</p> : null}
            <form className="submission-form" action={submitPhotoAction}>
              <div className="field-group"><label htmlFor="photo-provider">Provider</label><select id="photo-provider" name="providerId" required>{approvedClaims.map((claim) => <option key={claim.id} value={claim.providerId}>{claim.providerId}</option>)}</select></div>
              <div className="field-group"><label htmlFor="provider-photo">Photo</label><input id="provider-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></div>
              <label className="checkbox-row"><input name="consentAttested" type="checkbox" value="yes" required /> I confirm I have permission to submit this photo for public display after moderation.</label>
              <button className="primary-action" type="submit">Submit Photo</button>
            </form>
            {photoWorkspace.photos.length ? photoWorkspace.photos.map((photo) => <p className="muted-text" key={photo.id}>Provider {photo.providerId}: {photo.status}</p>) : <p className="muted-text">No submitted photos.</p>}
          </section>
          <section className="profile-card"><h2>Respond to a published review</h2><p className="muted-text">Responses require moderation. Editing creates audit history and returns the response to pending.</p>
            <form className="submission-form" action={submitResponseAction}>
              <ReviewSelect reviews={workspace.eligibleReviews} />
              <div className="field-group"><label htmlFor="response-text">Response</label><textarea id="response-text" name="responseText" minLength={10} maxLength={1000} rows={4} required /></div>
              <button className="primary-action" type="submit">Submit Response</button>
            </form>
          </section>
          <section className="profile-card"><h2>Open a private review dispute</h2><p className="muted-text">A dispute does not automatically remove or hide a review.</p>
            <form className="submission-form" action={submitDisputeAction}><ReviewSelect reviews={workspace.eligibleReviews} /><div className="field-group"><label htmlFor="dispute-reason">Private reason</label><textarea id="dispute-reason" name="reason" minLength={20} maxLength={2000} rows={4} required /></div><button className="primary-action" type="submit">Submit Dispute</button></form>
          </section>
          <section className="profile-card"><h2>Appeal a suspension</h2>
            <form className="submission-form" action={submitAppealAction}><div className="field-group"><label htmlFor="appeal-provider">Provider</label><select id="appeal-provider" name="providerId" required>{approvedClaims.map((claim) => <option key={claim.id} value={claim.providerId}>{claim.providerId}</option>)}</select></div><div className="field-group"><label htmlFor="appeal-reason">Private appeal</label><textarea id="appeal-reason" name="reason" minLength={20} maxLength={2000} rows={4} required /></div><button className="primary-action" type="submit">Submit Appeal</button></form>
          </section>
        </> : null}
      </main>
    );
  } catch { return <Unavailable />; }
}

function ReviewSelect({ reviews }: { reviews: Array<{ id: string; rating: number; reviewText: string }> }) {
  return <div className="field-group"><label htmlFor="review-id">Review</label><select id="review-id" name="reviewId" required><option value="">Choose a review</option>{reviews.map((review) => <option key={review.id} value={review.id}>{review.rating}/5 - {review.reviewText.slice(0, 70)}</option>)}</select></div>;
}

function Unavailable() { return <main className="page-shell provider-flow"><section className="profile-card"><h1>Provider tools unavailable</h1><p className="intro">Provider identity services are not configured in this environment.</p></section></main>; }
