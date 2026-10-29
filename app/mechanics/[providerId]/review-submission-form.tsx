"use client";

import { useState, type FormEvent } from "react";

import type { ReviewSubmissionFieldErrors, ReviewSubmissionInput } from "../../../src/reviews/reviewTypes.ts";
import { submitCustomerReviewAction } from "./review-actions";

const EMPTY_REVIEW = { rating: 0, reviewText: "", reviewerEmail: "", displayName: "", website: "" };

export function ReviewSubmissionForm({ providerId }: { providerId: string }) {
  const [form, setForm] = useState(EMPTY_REVIEW);
  const [errors, setErrors] = useState<ReviewSubmissionFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<Field extends keyof typeof EMPTY_REVIEW>(field: Field, value: (typeof EMPTY_REVIEW)[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await submitCustomerReviewAction({ providerId, ...form } as ReviewSubmissionInput);
    setIsSubmitting(false);
    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFormError(result.formError ?? null);
      return;
    }
    setSubmitted(true);
    setErrors({});
    setFormError(null);
    setForm(EMPTY_REVIEW);
  }

  if (submitted) {
    return (
      <div className="confirmation-panel" role="status">
        <h3>Check your email</h3>
        <p>Your review is not public. Use the single-use link within 30 minutes to verify email ownership, then it will await administrator moderation.</p>
      </div>
    );
  }

  return (
    <form className="review-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="rating-fieldset">
        <legend>Rating</legend>
        <div className="rating-options">
          {[1, 2, 3, 4, 5].map((rating) => (
            <label key={rating}>
              <input checked={form.rating === rating} name="rating" onChange={() => update("rating", rating)} type="radio" />
              <span>{rating} {rating === 1 ? "star" : "stars"}</span>
            </label>
          ))}
        </div>
        <FieldError id="rating-error" message={errors.rating} />
      </fieldset>

      <div className="field-group">
        <label htmlFor="review-text">Written review</label>
        <textarea id="review-text" maxLength={2000} minLength={20} onChange={(event) => update("reviewText", event.target.value)} rows={5} value={form.reviewText} />
        <p className="field-help">Describe your experience honestly. Negative reviews are allowed and assessed under the same moderation rules.</p>
        <FieldError id="review-text-error" message={errors.reviewText} />
      </div>

      <div className="form-grid">
        <div className="field-group">
          <label htmlFor="review-email">Email</label>
          <input id="review-email" inputMode="email" onChange={(event) => update("reviewerEmail", event.target.value)} value={form.reviewerEmail} />
          <p className="field-help">Private. Used only to verify email ownership and prevent abuse.</p>
          <FieldError id="review-email-error" message={errors.reviewerEmail} />
        </div>
        <div className="field-group">
          <label htmlFor="review-name">Public display name</label>
          <input id="review-name" maxLength={80} onChange={(event) => update("displayName", event.target.value)} placeholder="Optional; otherwise Anonymous" value={form.displayName} />
          <FieldError id="review-name-error" message={errors.displayName} />
        </div>
      </div>

      <div className="review-honeypot" aria-hidden="true">
        <label htmlFor="review-website">Website</label>
        <input autoComplete="off" id="review-website" onChange={(event) => update("website", event.target.value)} tabIndex={-1} value={form.website} />
      </div>

      <p className="field-help">Email verified means the reviewer controlled the email address. It does not verify a purchase, completed repair, or service relationship.</p>
      {formError ? <p className="field-error" role="alert">{formError}</p> : null}
      <button className="primary-action" disabled={isSubmitting} type="submit">{isSubmitting ? "Submitting..." : "Submit review"}</button>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="field-error" id={id}>{message}</p> : null;
}
