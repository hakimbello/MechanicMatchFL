"use client";

import { useActionState } from "react";

import { submitSafetyReportAction, type SafetyReportState } from "./actions";
import { getPublicMessages } from "../../../src/i18n/messages.ts";
import type { PublicLocale } from "../../../src/i18n/locale.ts";

export function SafetyReportForm({ providerId = "", locale = "en" }: { providerId?: string; locale?: PublicLocale }) {
  const messages = getPublicMessages(locale).safety;
  const [state, action, pending] = useActionState<SafetyReportState, FormData>(submitSafetyReportAction, {});
  if (state.ok) return <div className="confirmation-panel"><h2>{messages.received}</h2><p>{messages.receivedBody}</p></div>;
  return <form className="submission-form" action={action}>
    <input name="locale" type="hidden" value={locale} />
    {state.formError ? <p className="field-error" role="alert">{state.formError}</p> : null}
    <div className="field-group"><label htmlFor="safety-provider">{messages.providerId}</label><input id="safety-provider" name="providerId" defaultValue={providerId} /></div>
    <div className="field-group"><label htmlFor="safety-category">{messages.category}</label><select aria-describedby={state.errors?.category ? "safety-category-error" : undefined} aria-invalid={Boolean(state.errors?.category)} id="safety-category" name="category" required><option value="">{messages.choose}</option><option value="unsafe-work">{messages.unsafeWork}</option><option value="harassment">{messages.harassment}</option><option value="fraud">{messages.fraud}</option><option value="identity">{messages.identity}</option><option value="other">{messages.other}</option></select>{state.errors?.category ? <p className="field-error" id="safety-category-error">{state.errors.category}</p> : null}</div>
    <div className="field-group"><label htmlFor="safety-description">{messages.description}</label><textarea aria-describedby={state.errors?.description ? "safety-description-error" : undefined} aria-invalid={Boolean(state.errors?.description)} id="safety-description" name="description" minLength={40} maxLength={4000} rows={7} required />{state.errors?.description ? <p className="field-error" id="safety-description-error">{state.errors.description}</p> : null}</div>
    <div className="field-group"><label htmlFor="reporter-name">{messages.reporterName}</label><input id="reporter-name" name="reporterName" maxLength={100} /></div>
    <div className="field-group"><label htmlFor="reporter-email">{messages.reporterEmail}</label><input id="reporter-email" name="reporterEmail" type="email" maxLength={254} /><p className="field-help">{messages.contactHelp}</p></div>
    <div className="review-honeypot" aria-hidden="true"><label htmlFor="safety-website">Website</label><input id="safety-website" name="website" tabIndex={-1} autoComplete="off" /></div>
    <button className="primary-action" disabled={pending} type="submit">{pending ? messages.submitting : messages.submit}</button>
  </form>;
}
