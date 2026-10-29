import type { ReviewSubmissionFieldErrors, ReviewSubmissionInput } from "./reviewTypes.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REVIEW_TEXT_MIN_LENGTH = 20;
export const REVIEW_TEXT_MAX_LENGTH = 2000;

export function normalizeReviewerEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateReviewSubmission(input: ReviewSubmissionInput): ReviewSubmissionFieldErrors {
  const errors: ReviewSubmissionFieldErrors = {};
  const reviewText = input.reviewText.trim();
  const email = normalizeReviewerEmail(input.reviewerEmail);
  const displayName = input.displayName.trim();

  if (!input.providerId.trim()) {
    errors.providerId = "A provider is required.";
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.rating = "Choose a whole-number rating from 1 to 5 stars.";
  }
  if (reviewText.length < REVIEW_TEXT_MIN_LENGTH) {
    errors.reviewText = `Write at least ${REVIEW_TEXT_MIN_LENGTH} characters about your experience.`;
  } else if (reviewText.length > REVIEW_TEXT_MAX_LENGTH) {
    errors.reviewText = `Keep the review under ${REVIEW_TEXT_MAX_LENGTH} characters.`;
  }
  if (!EMAIL_PATTERN.test(email)) {
    errors.reviewerEmail = "Enter a valid email address.";
  } else if (email.length > 254) {
    errors.reviewerEmail = "Keep the email address under 254 characters.";
  }
  if (displayName.length > 80) {
    errors.displayName = "Keep the display name under 80 characters.";
  }
  if (input.website?.trim()) {
    errors.website = "Review submission could not be accepted.";
  }

  return errors;
}
