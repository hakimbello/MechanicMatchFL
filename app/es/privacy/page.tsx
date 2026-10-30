import { LocalizedPrivacy } from "../../privacy/localized-privacy";
import { buildPrivacyMetadata } from "../../../src/seo/metadata.ts";

export const metadata = buildPrivacyMetadata("es");
export default function SpanishPrivacyPage() { return <LocalizedPrivacy locale="es" />; }
