"use client";

import { useState, type FormEvent } from "react";

import type { ReviewSubmissionFieldErrors, ReviewSubmissionInput } from "../../../src/reviews/reviewTypes.ts";
import { submitCustomerReviewAction } from "./review-actions";
import { getPublicMessages } from "../../../src/i18n/messages.ts";
import type { PublicLocale } from "../../../src/i18n/locale.ts";

const EMPTY_REVIEW = { rating: 0, reviewText: "", reviewerEmail: "", displayName: "", website: "" };

export function ReviewSubmissionForm({ providerId, locale = "en" }: { providerId: string; locale?: PublicLocale }) {
  const messages = getPublicMessages(locale).reviewForm;
  const [form, setForm] = useState(EMPTY_REVIEW);
  const [errors, setErrors] = useState<ReviewSubmissionFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasFieldErrors = Object.values(errors).some(Boolean);

  function update<Field extends keyof typeof EMPTY_REVIEW>(field: Field, value: (typeof EMPTY_REVIEW)[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await submitCustomerReviewAction({ providerId, ...form } as ReviewSubmissionInput, locale);
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
        <h3>{messages.checkEmail}</h3>
        <p>{messages.submitted}</p>
      </div>
    );
  }

  return (
    <form className="review-form" onSubmit={handleSubmit} noValidate>
      {hasFieldErrors ? <p className="field-error form-error-summary" role="alert">{messages.correctErrors}</p> : null}
      <fieldset className="rating-fieldset">
        <legend>{messages.rating}</legend>
        <div className="rating-options">
          {[1, 2, 3, 4, 5].map((rating) => (
            <label key={rating}>
              <input checked={form.rating === rating} name="rating" onChange={() => update("rating", rating)} type="radio" />
              <span>{rating} {rating === 1 ? messages.star : messages.stars}</span>
            </label>
          ))}
        </div>
        <FieldError id="rating-error" message={errors.rating} />
      </fieldset>

      <div className="field-group">
        <label htmlFor="review-text">{messages.written}</label>
        <textarea aria-describedby={errors.reviewText ? "review-text-error" : "review-text-help"} aria-invalid={Boolean(errors.reviewText)} id="review-text" maxLength={2000} minLength={20} onChange={(event) => update("reviewText", event.target.value)} rows={5} value={form.reviewText} />
        <p className="field-help" id="review-text-help">{messages.honestHelp}</p>
        <FieldError id="review-text-error" message={errors.reviewText} />
      </div>

      <div className="form-grid">
        <div className="field-group">
          <label htmlFor="review-email">{messages.email}</label>
          <input aria-describedby={errors.reviewerEmail ? "review-email-error" : "review-email-help"} aria-invalid={Boolean(errors.reviewerEmail)} id="review-email" inputMode="email" onChange={(event) => update("reviewerEmail", event.target.value)} value={form.reviewerEmail} />
          <p className="field-help" id="review-email-help">{messages.emailHelp}</p>
          <FieldError id="review-email-error" message={errors.reviewerEmail} />
        </div>
        <div className="field-group">
          <label htmlFor="review-name">{messages.displayName}</label>
          <input aria-describedby={errors.displayName ? "review-name-error" : undefined} aria-invalid={Boolean(errors.displayName)} id="review-name" maxLength={80} onChange={(event) => update("displayName", event.target.value)} placeholder={messages.displayNamePlaceholder} value={form.displayName} />
          <FieldError id="review-name-error" message={errors.displayName} />
        </div>
      </div>

      <div className="review-honeypot" aria-hidden="true">
        <label htmlFor="review-website">Website</label>
        <input autoComplete="off" id="review-website" onChange={(event) => update("website", event.target.value)} tabIndex={-1} value={form.website} />
      </div>

      <p className="field-help" data-policy="Email verification does not verify a purchase, completed repair, or service relationship">{messages.verificationHelp}</p>
      {formError ? <p className="field-error" role="alert">{formError}</p> : null}
      <button className="primary-action" disabled={isSubmitting} type="submit">{isSubmitting ? messages.submitting : messages.submit}</button>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="field-error" id={id}>{message}</p> : null;
}
