import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminAuthorization } from "../../../src/admin/adminAuth.ts";
import { getReviewPersistenceForRuntime } from "../../../src/reviews/runtimeReviewPersistence.ts";
import { adminProvidersMetadata } from "../../../src/seo/metadata.ts";
import { signOutAdminAction } from "../actions";
import { moderateCustomerReviewAction } from "./actions";
import { AdminReviews } from "./reviews-admin";

export const metadata = adminProvidersMetadata;
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const authorization = await getAdminAuthorization();
  if (!authorization.ok && authorization.reason === "unauthenticated") redirect("/admin/login?next=/admin/reviews");
  if (!authorization.ok) return <AdminUnavailable />;

  try {
    const reviews = await getReviewPersistenceForRuntime().listReviewsForAdmin(authorization.admin);
    return <AdminReviews initialReviews={reviews} onModerate={moderateCustomerReviewAction} onSignOut={signOutAdminAction} />;
  } catch {
    return <AdminUnavailable />;
  }
}

function AdminUnavailable() {
  return (
    <main className="page-shell provider-flow">
      <Link className="back-link" href="/">Back to Search</Link>
      <section className="profile-card"><p className="eyebrow">Admin</p><h1>Review moderation unavailable</h1><p className="intro">Review data could not be loaded or you are not authorized.</p></section>
    </main>
  );
}
