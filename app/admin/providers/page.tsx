import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminProvidersReview } from "./providers-admin";
import { getAdminAuthorization } from "../../../src/admin/adminAuth.ts";
import { adminProvidersMetadata } from "../../../src/seo/metadata.ts";
import { getProviderPersistenceForRuntime } from "../../../src/providers/runtimeProviderPersistence.ts";
import { signOutAdminAction } from "../actions";
import { transitionProviderStatusAction } from "./actions";

export const metadata = adminProvidersMetadata;
export const dynamic = "force-dynamic";

export default async function AdminProvidersPage() {
  const authorization = await getAdminAuthorization();

  if (!authorization.ok && authorization.reason === "unauthenticated") {
    redirect("/admin/login?next=/admin/providers");
  }

  if (!authorization.ok) {
    return (
      <main className="page-shell provider-flow">
        <Link className="back-link" href="/">
          Back to Search
        </Link>
        <section className="profile-card">
          <p className="eyebrow">Admin</p>
          <h1>Provider review unavailable</h1>
          <p className="intro">
            {authorization.reason === "missing-config"
              ? "Production admin access is not configured for this environment."
              : "You are not authorized to view provider submissions."}
          </p>
        </section>
        <form action={signOutAdminAction}>
          <button className="secondary-action" type="submit">
            Sign Out
          </button>
        </form>
      </main>
    );
  }

  try {
    const persistence = getProviderPersistenceForRuntime();
    const records = await persistence.listProviderSubmissionsForAdmin(authorization.admin);

    return (
      <AdminProvidersReview
        initialRecords={records}
        onSignOut={signOutAdminAction}
        onTransitionProvider={transitionProviderStatusAction}
      />
    );
  } catch {
    return (
      <main className="page-shell provider-flow">
        <Link className="back-link" href="/">
          Back to Search
        </Link>
        <section className="profile-card">
          <p className="eyebrow">Admin</p>
          <h1>Provider review unavailable</h1>
          <p className="intro">Provider review data could not be loaded in this environment.</p>
        </section>
      </main>
    );
  }
}
