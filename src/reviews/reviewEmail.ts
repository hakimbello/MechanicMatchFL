import "server-only";
import type { PublicLocale } from "../i18n/locale.ts";

export const REVIEW_EMAIL_ENV_VARS = ["RESEND_API_KEY", "REVIEW_EMAIL_FROM", "NEXT_PUBLIC_SITE_URL"] as const;
export const REVIEW_ABUSE_ENV_VAR = "REVIEW_ABUSE_HASH_KEY" as const;

type ReviewEmailEnvironment = Partial<NodeJS.ProcessEnv>;

export interface ReviewVerificationEmail {
  recipient: string;
  providerName: string;
  verificationUrl: string;
  idempotencyKey: string;
  locale?: PublicLocale;
}

export interface ReviewEmailSender {
  sendVerificationEmail(message: ReviewVerificationEmail): Promise<{ deliveryId: string }>;
}

export class ReviewEmailConfigurationError extends Error {
  readonly missingNames: string[];

  constructor(missingNames: string[]) {
    super("Review email delivery is not configured.");
    this.name = "ReviewEmailConfigurationError";
    this.missingNames = missingNames;
  }
}

export class ReviewEmailDeliveryError extends Error {
  constructor() {
    super("Review verification email could not be delivered.");
    this.name = "ReviewEmailDeliveryError";
  }
}

export function getReviewDeliveryConfig(env: ReviewEmailEnvironment = process.env): {
  apiKey: string;
  from: string;
  siteUrl: string;
  abuseHashKey: string;
} {
  const required = [...REVIEW_EMAIL_ENV_VARS, REVIEW_ABUSE_ENV_VAR];
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) {
    throw new ReviewEmailConfigurationError(missing);
  }

  const siteUrl = new URL(env.NEXT_PUBLIC_SITE_URL!.trim());
  if (siteUrl.protocol !== "https:" && siteUrl.hostname !== "localhost") {
    throw new ReviewEmailConfigurationError(["NEXT_PUBLIC_SITE_URL"]);
  }

  return {
    apiKey: env.RESEND_API_KEY!.trim(),
    from: env.REVIEW_EMAIL_FROM!.trim(),
    siteUrl: siteUrl.origin,
    abuseHashKey: env.REVIEW_ABUSE_HASH_KEY!.trim()
  };
}

export function createResendReviewEmailSender(config = getReviewDeliveryConfig()): ReviewEmailSender {
  return {
    async sendVerificationEmail(message) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey
        },
        body: JSON.stringify({
          from: config.from,
          to: [message.recipient],
          subject: message.locale === "es" ? "Verifica tu reseña de MechanicMatchFL" : "Verify your MechanicMatchFL review",
          html: buildVerificationEmailHtml(message)
        }),
        cache: "no-store"
      });
      const result = (await response.json().catch(() => null)) as { id?: string } | null;
      if (!response.ok || !result?.id) {
        throw new ReviewEmailDeliveryError();
      }
      return { deliveryId: result.id };
    }
  };
}

function buildVerificationEmailHtml(message: ReviewVerificationEmail): string {
  const providerName = escapeHtml(message.providerName);
  const verificationUrl = escapeHtml(message.verificationUrl);
  if (message.locale === "es") {
    return `<p>Confirma tu correo para enviar tu reseña de ${providerName} a moderación.</p><p><a href="${verificationUrl}">Verificar correo</a></p><p>Este enlace vence en 30 minutos y solo puede usarse una vez. La verificación confirma únicamente la propiedad del correo; no verifica una compra, reparación o relación de servicio.</p>`;
  }
  return `<p>Confirm your email address to submit your review of ${providerName} for moderation.</p><p><a href="${verificationUrl}">Verify email</a></p><p>This link expires in 30 minutes and can be used once. Email verification confirms email ownership only; it does not verify a purchase, repair, or service relationship.</p>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]!);
}
