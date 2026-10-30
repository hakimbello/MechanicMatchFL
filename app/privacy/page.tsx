import { LocalizedPrivacy } from "./localized-privacy";
import { buildPrivacyMetadata } from "../../src/seo/metadata.ts";

export const metadata = buildPrivacyMetadata("en");

export default function PrivacyPage() {
  return <LocalizedPrivacy locale="en" />;
}
