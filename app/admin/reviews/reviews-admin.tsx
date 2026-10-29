"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { ReviewSubmissionRecord } from "../../../src/reviews/reviewTypes.ts";
import type { AdminReviewActionResult } from "./actions";

export function AdminReviews({
  initialReviews,
  onModerate,
  onSignOut
}: {
  initialReviews: ReviewSubmissionRecord[];
  onModerate: (reviewId: string, decision: "approved" | "rejected", reason: string) => Promise<AdminReviewActionResult>;
  onSignOut: () => Promise<void>;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selected = reviews.find((review) => review.id === selectedId) ?? reviews[0] ?? null;

  function moderate(decision: "approved" | "rejected") {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await onModerate(selected.id, decision, reason);
      if (!result.ok) { setError(result.error); return; }
      setReviews(result.reviews);
      setReason("");
    });
  }

  return (
    <main className="page-shell provider-flow">
      <Link className="back-link" href="/admin/providers">Provider moderation</Link>
      <section className="profile-card">
        <p className="eyebrow">Admin</p><h1>Customer review moderation</h1>
        <p className="intro">Email verification confirms ownership only. Moderate content fairly; a negative rating alone is not grounds for rejection.</p>
        <form action={onSignOut}><button className="secondary-action" type="submit">Sign Out</button></form>
      </section>
      <section className="admin-layout">
        <div className="profile-card">
          <h2>Review queue</h2>
          <div className="admin-list">
            {reviews.map((review) => (
              <button className={review.id === selected?.id ? "admin-list-item active-admin-item" : "admin-list-item"} key={review.id} onClick={() => { setSelectedId(review.id); setReason(""); setError(null); }} type="button">
                <span>{review.displayName || "Anonymous"} · {review.rating}/5</span><span>{review.status}</span>
              </button>
            ))}
          </div>
          {!reviews.length ? <p className="muted-text">No customer reviews have been submitted.</p> : null}
        </div>
        <div className="profile-card">
          {selected ? (
            <>
              <h2>{selected.rating} / 5 stars</h2>
              <p>{selected.reviewText}</p>
              <dl className="detail-list admin-detail-list">
                <dt>Public name</dt><dd>{selected.displayName || "Anonymous"}</dd>
                <dt>Status</dt><dd>{selected.status}</dd>
                <dt>Email ownership</dt><dd>{selected.emailVerifiedAt ? "Verified" : "Not verified"}</dd>
                <dt>Service verification</dt><dd>Not independently verified</dd>
              </dl>
              {selected.status === "pending-moderation" ? (
                <>
                  <div className="field-group">
                    <label htmlFor="moderation-reason">Private moderation reason</label>
                    <textarea id="moderation-reason" maxLength={500} onChange={(event) => setReason(event.target.value)} rows={3} value={reason} />
                  </div>
                  {error ? <p className="field-error" role="alert">{error}</p> : null}
                  <div className="admin-actions">
                    <button className="secondary-action admin-action-button" disabled={isPending} onClick={() => moderate("approved")} type="button">Approve</button>
                    <button className="secondary-action admin-action-button" disabled={isPending} onClick={() => moderate("rejected")} type="button">Reject</button>
                  </div>
                </>
              ) : <p className="muted-text">Decision recorded privately: {selected.moderationReason ?? "No reason available"}</p>}
            </>
          ) : <p className="muted-text">Choose a review to moderate.</p>}
        </div>
      </section>
    </main>
  );
}
