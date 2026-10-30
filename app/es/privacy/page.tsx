import type { Metadata } from "next";
import { localeAlternates } from "../../../src/i18n/locale.ts";
import { LocalizedPrivacy } from "../../privacy/localized-privacy";

export const metadata: Metadata = { title: "Privacidad", alternates: { ...localeAlternates("/privacy"), canonical: "/es/privacy" } };
export default function SpanishPrivacyPage() { return <LocalizedPrivacy locale="es" />; }
