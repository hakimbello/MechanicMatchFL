import type { ReviewEmailSender, ReviewVerificationEmail } from "./reviewEmail.ts";
import type { ReviewPersistence } from "./reviewPersistence.ts";

export async function deliverReviewVerification(
  reviewId: string,
  tokenHash: string,
  message: ReviewVerificationEmail,
  sender: ReviewEmailSender,
  persistence: ReviewPersistence
): Promise<boolean> {
  let deliveryId: string;
  try {
    ({ deliveryId } = await sender.sendVerificationEmail(message));
  } catch {
    await discardUnmarkedReview(persistence, reviewId, tokenHash);
    return false;
  }

  try {
    await persistence.markVerificationEmailSent(reviewId, tokenHash, deliveryId);
    return true;
  } catch {
    // The accepted email remains unusable unless this exact token is marked sent.
    await discardUnmarkedReview(persistence, reviewId, tokenHash);
    return false;
  }
}

async function discardUnmarkedReview(persistence: ReviewPersistence, reviewId: string, tokenHash: string) {
  await persistence.discardUndeliveredReview(reviewId, tokenHash).catch(() => undefined);
}
