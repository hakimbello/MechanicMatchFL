import { isIP } from "node:net";

export const SHARED_REVIEW_RATE_LIMIT_IDENTITY = "shared:untrusted-client";

type ReviewPlatformEnvironment = { [name: string]: string | undefined; VERCEL?: string };

/**
 * Vercel overwrites its forwarding headers at the edge. Outside Vercel there is
 * no configured trusted proxy, so all callers intentionally share one bucket.
 */
export function getReviewRateLimitIdentity(
  requestHeaders: Pick<Headers, "get">,
  env: ReviewPlatformEnvironment = process.env
): string {
  if (env.VERCEL !== "1") return SHARED_REVIEW_RATE_LIMIT_IDENTITY;

  const candidate = requestHeaders.get("x-vercel-forwarded-for")?.trim();
  if (!candidate || candidate.includes(",") || isIP(candidate) === 0) {
    return SHARED_REVIEW_RATE_LIMIT_IDENTITY;
  }

  return `ip:${candidate.toLowerCase()}`;
}
