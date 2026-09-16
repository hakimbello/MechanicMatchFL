"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { ProviderStatus } from "../../../src/domain/providers.ts";
import { buildAdminReviewView } from "../../../src/submissions/adminReview.ts";
import { canTransitionProviderStatus } from "../../../src/submissions/lifecycle.ts";
import type { ProviderSubmissionRecord } from "../../../src/submissions/submissionTypes.ts";
import type { AdminTransitionActionResult } from "./actions";

const REVIEW_ACTIONS: { status: ProviderStatus; label: string }[] = [
  { status: "under-review", label: "Move to Under Review" },
  { status: "approved", label: "Approve" },
  { status: "active", label: "Activate" },
  { status: "changes-requested", label: "Request Changes" },
  { status: "rejected", label: "Reject" },
  { status: "deactivated", label: "Deactivate" }
];

export function AdminProvidersReview({
  initialRecords,
  onSignOut,
  onTransitionProvider
}: {
  initialRecords: ProviderSubmissionRecord[];
  onSignOut: () => Promise<void>;
  onTransitionProvider: (id: string, status: ProviderStatus) => Promise<AdminTransitionActionResult>;
}) {
  const [records, setRecords] = useState<ProviderSubmissionRecord[]>(initialRecords);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? null;
  const review = selectedRecord ? buildAdminReviewView(selectedRecord) : null;

  function updateStatus(status: ProviderStatus) {
    if (!selectedRecord) {
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const result = await onTransitionProvider(selectedRecord.id, status);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }

      setRecords(result.records);
      setSelectedId(selectedRecord.id);
    });
  }

  return (
    <main className="page-shell provider-flow">
      <Link className="back-link" href="/">
        Back to Search
      </Link>

      <section className="profile-card">
        <p className="eyebrow">Admin</p>
        <h1>Provider review</h1>
        <p className="intro">Review submitted providers and perform approved lifecycle transitions.</p>
        <form action={onSignOut}>
          <button className="secondary-action" type="submit">
            Sign Out
          </button>
        </form>
      </section>

      <section className="admin-layout">
        <div className="profile-card">
          <h2>Submitted providers</h2>
          {records.length === 0 ? <p className="muted-text">No provider submissions are awaiting review.</p> : null}
          <div className="admin-list">
            {records.map((record) => (
              <button
                className={record.id === selectedRecord?.id ? "admin-list-item active-admin-item" : "admin-list-item"}
                key={record.id}
                onClick={() => setSelectedId(record.id)}
                type="button"
              >
                <span>{record.businessName}</span>
                <span>{record.status}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="profile-card">
          {review ? (
            <>
              <h2>{review.businessName}</h2>
              {actionError ? (
                <p className="field-error" role="alert">
                  {actionError}
                </p>
              ) : null}
              <dl className="detail-list admin-detail-list">
                <dt>Status</dt>
                <dd>{review.status}</dd>
                <dt>Public eligibility</dt>
                <dd>{review.publicEligibility}</dd>
                <dt>Provider type</dt>
                <dd>{review.providerType}</dd>
                <dt>Relationship</dt>
                <dd>{review.relationship}</dd>
                <dt>Authorization</dt>
                <dd>{review.authorization}</dd>
                <dt>Contact</dt>
                <dd>{review.contact}</dd>
                <dt>Services</dt>
                <dd>{review.services.join(", ")}</dd>
                <dt>Vehicles</dt>
                <dd>{review.vehicleCompatibility}</dd>
                <dt>Location</dt>
                <dd>{review.location}</dd>
                <dt>Registration</dt>
                <dd>{review.registration}</dd>
                <dt>Description</dt>
                <dd>{review.description}</dd>
              </dl>

              <div className="admin-actions" aria-label="Provider review actions">
                {REVIEW_ACTIONS.map((action) => (
                  <button
                    className="secondary-action admin-action-button"
                    disabled={isPending || !canTransitionProviderStatus(review.status, action.status)}
                    key={action.status}
                    onClick={() => updateStatus(action.status)}
                    type="button"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="muted-text">Choose a submitted provider to review.</p>
          )}
        </div>
      </section>
    </main>
  );
}
