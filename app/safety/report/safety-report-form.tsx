"use client";

import { useActionState } from "react";

import { submitSafetyReportAction, type SafetyReportState } from "./actions";

export function SafetyReportForm({ providerId = "" }: { providerId?: string }) {
  const [state, action, pending] = useActionState<SafetyReportState, FormData>(submitSafetyReportAction, {});
  if (state.ok) return <div className="confirmation-panel"><h2>Report received</h2><p>The report is private and will be reviewed by an administrator.</p></div>;
  return <form className="submission-form" action={action}>
    {state.formError ? <p className="field-error" role="alert">{state.formError}</p> : null}
    <div className="field-group"><label htmlFor="safety-provider">Provider ID (optional)</label><input id="safety-provider" name="providerId" defaultValue={providerId} /></div>
    <div className="field-group"><label htmlFor="safety-category">Incident category</label><select id="safety-category" name="category" required><option value="">Choose one</option><option value="unsafe-work">Unsafe work</option><option value="harassment">Harassment</option><option value="fraud">Fraud</option><option value="identity">Identity concern</option><option value="other">Other</option></select>{state.errors?.category ? <p className="field-error">{state.errors.category}</p> : null}</div>
    <div className="field-group"><label htmlFor="safety-description">What happened?</label><textarea id="safety-description" name="description" minLength={40} maxLength={4000} rows={7} required />{state.errors?.description ? <p className="field-error">{state.errors.description}</p> : null}</div>
    <div className="field-group"><label htmlFor="reporter-name">Your name (optional and private)</label><input id="reporter-name" name="reporterName" maxLength={100} /></div>
    <div className="field-group"><label htmlFor="reporter-email">Contact email (optional and private)</label><input id="reporter-email" name="reporterEmail" type="email" maxLength={254} /><p className="field-help">Contact details are not shown to providers or the public.</p></div>
    <div className="review-honeypot" aria-hidden="true"><label htmlFor="safety-website">Website</label><input id="safety-website" name="website" tabIndex={-1} autoComplete="off" /></div>
    <button className="primary-action" disabled={pending} type="submit">{pending ? "Submitting..." : "Submit Confidential Report"}</button>
  </form>;
}
