import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminAuthorization } from "../../../src/admin/adminAuth.ts";
import { createSupabaseServerAuthClient } from "../../../src/supabase/serverClient.ts";
import { getTrustPersistenceForRuntime } from "../../../src/trust/runtimeTrustPersistence.ts";
import { decideAppealAction, moderateResponseAction, reviewClaimAction, suspensionAction, updateDisputeAction, updateSafetyAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trust Operations | MechanicMatchFL", robots: { index: false, follow: false } };

export default async function AdminTrustPage() {
  const authorization = await getAdminAuthorization();
  if (!authorization.ok && authorization.reason === "unauthenticated") redirect("/admin/login?next=/admin/trust");
  if (!authorization.ok) return <Unavailable />;
  try {
    const workspace = await getTrustPersistenceForRuntime(await createSupabaseServerAuthClient()).getAdminWorkspace(authorization.admin);
    return <main className="page-shell provider-flow"><Link className="back-link" href="/admin/providers">Provider Admin</Link><section className="profile-card"><p className="eyebrow">Admin trust operations</p><h1>Claims, disputes, and safety</h1><p className="intro">All decisions are private, attributed, and retained. Negative reviews do not trigger automatic suspension.</p></section>
      <Queue title="Ownership claims" items={workspace.claims.map(x=>({id:x.id,summary:`Provider ${x.providerId} - ${x.status}`,detail:x.evidence}))} action={reviewClaimAction} options={["approved","rejected","disabled","revoked"]} />
      <Queue title="Provider responses" items={workspace.responses.map(x=>({id:x.id,summary:`Review ${x.reviewId} - ${x.status}`,detail:x.responseText}))} action={moderateResponseAction} options={["approved","rejected"]} />
      <Queue title="Private disputes" items={workspace.disputes.map(x=>({id:x.id,summary:`Review ${x.reviewId} - ${x.status}`,detail:x.reason}))} action={updateDisputeAction} options={["reviewing","resolved","dismissed"]} field="status" />
      <Queue title="Confidential safety reports" items={workspace.safetyIncidents.map(x=>({id:x.id,summary:`${x.category} - ${x.status}`,detail:x.description}))} action={updateSafetyAction} options={["investigating","resolved","dismissed"]} field="status" />
      <section className="profile-card"><h2>Provider suspension or reinstatement</h2><form className="submission-form" action={suspensionAction}><div className="field-group"><label htmlFor="suspension-provider">Provider ID</label><input id="suspension-provider" name="providerId" required /></div><div className="field-group"><label htmlFor="suspension-action">Action</label><select id="suspension-action" name="action"><option value="suspend">Suspend</option><option value="reinstate">Reinstate</option></select></div><div className="field-group"><label htmlFor="suspension-reason">Private reason</label><textarea id="suspension-reason" name="reason" minLength={20} maxLength={2000} required /></div><button className="primary-action" type="submit">Record Action</button></form>{workspace.suspensions.map(x=><p className="muted-text" key={x.id}>{x.providerId}: {x.status}</p>)}</section>
      <Queue title="Suspension appeals" items={workspace.appeals.map(x=>({id:x.id,summary:`Provider ${x.providerId} - ${x.status}`,detail:x.reason}))} action={decideAppealAction} options={["granted","upheld","closed"]} field="decision" />
    </main>;
  } catch { return <Unavailable />; }
}

function Queue({title,items,action,options,field="decision"}:{title:string;items:Array<{id:string;summary:string;detail:string}>;action:(data:FormData)=>Promise<void>;options:string[];field?:string}) {
  return <section className="profile-card"><h2>{title}</h2>{items.length===0?<p className="muted-text">No records.</p>:items.map(item=><article className="public-review" key={item.id}><strong>{item.summary}</strong><p>{item.detail}</p><form className="submission-form" action={action}><input type="hidden" name="id" value={item.id}/><div className="field-group"><label htmlFor={`${field}-${item.id}`}>Decision</label><select id={`${field}-${item.id}`} name={field}>{options.map(option=><option key={option}>{option}</option>)}</select></div><div className="field-group"><label htmlFor={`reason-${item.id}`}>Private reason</label><textarea id={`reason-${item.id}`} name="reason" minLength={10} maxLength={2000} required /></div><button className="secondary-action admin-action-button" type="submit">Save Decision</button></form></article>)}</section>;
}
function Unavailable(){return <main className="page-shell"><section className="profile-card"><h1>Trust operations unavailable</h1><p className="intro">This area is unavailable or you are not authorized.</p></section></main>;}
