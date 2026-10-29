import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";

export function createReviewVerificationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashReviewVerificationToken(token) };
}

export function hashReviewVerificationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashReviewAbuseValue(value: string, key: string): string {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

export function createModerationAuthorizationHash(): string {
  return randomBytes(32).toString("hex");
}
