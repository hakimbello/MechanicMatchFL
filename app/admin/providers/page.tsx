import { notFound } from "next/navigation";

import { AdminProvidersReview } from "./providers-admin";
import { adminProvidersMetadata } from "../../../src/seo/metadata.ts";
import { isDevelopmentAdminRouteAvailable } from "../../../src/security/adminGuard.ts";

export const metadata = adminProvidersMetadata;

export default function AdminProvidersPage() {
  if (!isDevelopmentAdminRouteAvailable()) {
    notFound();
  }

  return <AdminProvidersReview />;
}
