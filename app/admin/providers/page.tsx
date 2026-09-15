import { AdminProvidersReview } from "./providers-admin";
import { adminProvidersMetadata } from "../../../src/seo/metadata.ts";

export const metadata = adminProvidersMetadata;

export default function AdminProvidersPage() {
  return <AdminProvidersReview />;
}
