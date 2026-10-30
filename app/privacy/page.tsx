import type { Metadata } from "next";
import { LocalizedPrivacy } from "./localized-privacy";
import { localeAlternates } from "../../src/i18n/locale.ts";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How MechanicMatchFL handles search, provider submission, and analytics data in the current MVP.",
  alternates: {
    ...localeAlternates("/privacy"),
    canonical: "/privacy"
  }
};

export default function PrivacyPage() {
  return <LocalizedPrivacy locale="en" />;
}
