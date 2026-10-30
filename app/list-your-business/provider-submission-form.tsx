"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";

import {
  recordProviderSubmissionCompleted,
  recordProviderSubmissionStarted
} from "../../src/analytics/client.ts";
import {
  LAUNCH_COUNTIES,
  PROVIDER_SPECIALTIES,
  PROVIDER_TYPES,
  type LaunchCounty,
  type ProviderSpecialty
} from "../../src/domain/providers.ts";
import { formatProviderType, formatSpecialty } from "../../src/presentation/providerText.ts";
import {
  AUTHORIZATION_RELATIONSHIPS,
  EMPTY_PROVIDER_SUBMISSION,
  type AuthorizationRelationship,
  type ProviderSubmissionInput,
  type SubmissionFieldErrors
} from "../../src/submissions/submissionTypes.ts";
import { submitProviderAction } from "./actions";
import { formatMessage, getPublicMessages } from "../../src/i18n/messages.ts";
import { localizePublicPath, type PublicLocale } from "../../src/i18n/locale.ts";

const RELATIONSHIP_LABELS: Record<AuthorizationRelationship, string> = {
  myself: "Myself",
  "my-business": "My business",
  "family-member": "A family member",
  "i-work-for-this-business": "I work for this business"
};

export function ProviderSubmissionForm({ locale = "en" }: { locale?: PublicLocale }) {
  const messages = getPublicMessages(locale).listing;
  const [form, setForm] = useState<ProviderSubmissionInput>(EMPTY_PROVIDER_SUBMISSION);
  const [errors, setErrors] = useState<SubmissionFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [hasStartedSubmission, setHasStartedSubmission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function markSubmissionStarted() {
    setHasStartedSubmission((current) => {
      if (!current) {
        recordProviderSubmissionStarted();
      }

      return true;
    });
  }

  function updateField<Field extends keyof ProviderSubmissionInput>(field: Field, value: ProviderSubmissionInput[Field]) {
    markSubmissionStarted();
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  }

  function toggleService(service: ProviderSpecialty) {
    markSubmissionStarted();
    setForm((current) => {
      const services = current.services.includes(service)
        ? current.services.filter((item) => item !== service)
        : [...current.services, service];
      return { ...current, services };
    });
    setErrors((current) => {
      const next = { ...current };
      delete next.services;
      return next;
    });
    setFormError(null);
  }

  function toggleLanguage(language: "English" | "Spanish") {
    markSubmissionStarted();
    setForm((current) => {
      const spokenLanguages = current.spokenLanguages.includes(language)
        ? current.spokenLanguages.filter((item) => item !== language)
        : [...current.spokenLanguages, language];
      return { ...current, spokenLanguages };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await submitProviderAction(form, locale);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      setFormError(result.formError ?? null);
      setSubmittedName(null);
      return;
    }

    setSubmittedName(result.businessName);
    setErrors({});
    setFormError(null);
    setForm(EMPTY_PROVIDER_SUBMISSION);
    setHasStartedSubmission(false);
    recordProviderSubmissionCompleted({
      providerType: result.providerType,
      locationKind: result.locationKind
    });
  }

  return (
    <main className="page-shell provider-flow">
      <Link className="back-link" href={localizePublicPath("/", locale)}>
        {messages.back}
      </Link>

      <section className="profile-card">
        <p className="eyebrow">{messages.eyebrow}</p>
        <h1>{messages.title}</h1>
        <p className="intro">{messages.intro}</p>
      </section>

      {submittedName ? (
        <section className="confirmation-panel" role="status">
          <h2>{messages.submittedTitle}</h2>
          <p>{formatMessage(messages.submittedBody, { name: submittedName })}</p>
          <Link className="secondary-action standalone-link" href={localizePublicPath("/", locale)}>
            {messages.back}
          </Link>
        </section>
      ) : null}

      {formError ? (
        <section className="confirmation-panel error-panel" role="alert">
          <h2>{messages.errorTitle}</h2>
          <p>{formError}</p>
        </section>
      ) : null}

      <form className="submission-form" onSubmit={handleSubmit} noValidate>
        <section className="form-section" aria-labelledby="about-business">
          <h2 id="about-business">{messages.about}</h2>
          <TextField
            error={errors.businessName}
            label={messages.businessName}
            name="businessName"
            onChange={(value) => updateField("businessName", value)}
            value={form.businessName}
          />
          <TextField
            error={errors.phone}
            inputMode="tel"
            label={messages.phone}
            name="phone"
            onChange={(value) => updateField("phone", value)}
            value={form.phone}
          />
          <TextField
            error={errors.email}
            inputMode="email"
            label={messages.email}
            name="email"
            onChange={(value) => updateField("email", value)}
            value={form.email}
          />
          <SelectField
            error={errors.providerType}
            label={messages.providerType}
            name="providerType"
            onChange={(value) => updateField("providerType", value as ProviderSubmissionInput["providerType"])}
            options={PROVIDER_TYPES.map((type) => ({ value: type, label: formatProviderType(type, locale) }))}
            placeholder={messages.chooseOne}
            value={form.providerType}
          />
        </section>

        <section className="form-section" aria-labelledby="work-on">
          <h2 id="work-on">{messages.workOn}</h2>
          <fieldset className="service-options">
            <legend>{messages.services}</legend>
            <div className="service-grid">
              {PROVIDER_SPECIALTIES.map((service) => (
                <label className="service-choice" key={service}>
                  <input
                    checked={form.services.includes(service)}
                    onChange={() => toggleService(service)}
                    type="checkbox"
                  />
                  <span>{formatSpecialty(service, locale)}</span>
                </label>
              ))}
            </div>
            <FieldError id="services-error" message={errors.services} />
          </fieldset>

          <fieldset className="service-options">
            <legend>{messages.compatibility}</legend>
            <label className="service-choice">
              <input
                checked={form.allMakes}
                name="allMakes"
                onChange={() => updateField("allMakes", true)}
                type="radio"
              />
              <span>{messages.allMakes}</span>
            </label>
            <label className="service-choice">
              <input
                checked={!form.allMakes}
                name="allMakes"
                onChange={() => updateField("allMakes", false)}
                type="radio"
              />
              <span>{messages.selectedMakes}</span>
            </label>
            {!form.allMakes ? (
              <TextField
                error={errors.makesServiced}
                label={messages.makesServiced}
                name="makesServiced"
                onChange={(value) => updateField("makesServiced", value)}
                placeholder="Honda, Toyota, Ford"
                value={form.makesServiced}
              />
            ) : null}
            <TextField
              label={messages.specialtyMakes}
              name="specialtyMakes"
              onChange={(value) => updateField("specialtyMakes", value)}
              placeholder={messages.optionalComma}
              value={form.specialtyMakes}
            />
          </fieldset>
        </section>

        <section className="form-section" aria-labelledby="where-work">
          <h2 id="where-work">{messages.where}</h2>
          <fieldset className="service-options">
            <legend>{messages.workLocation}</legend>
            <label className="service-choice">
              <input
                checked={form.locationKind === "physical"}
                name="locationKind"
                onChange={() => updateField("locationKind", "physical")}
                type="radio"
              />
              <span>{messages.physical}</span>
            </label>
            <label className="service-choice">
              <input
                checked={form.locationKind === "mobile"}
                name="locationKind"
                onChange={() => updateField("locationKind", "mobile")}
                type="radio"
              />
              <span>{messages.mobile}</span>
            </label>
            <FieldError id="location-kind-error" message={errors.locationKind} />
          </fieldset>

          {form.locationKind === "physical" ? (
            <div className="form-grid">
              <TextField error={errors.street} label={messages.street} name="street" onChange={(value) => updateField("street", value)} value={form.street} />
              <TextField error={errors.city} label={messages.city} name="city" onChange={(value) => updateField("city", value)} value={form.city} />
              <SelectField
                error={errors.county}
                label={messages.county}
                name="county"
                onChange={(value) => updateField("county", value as LaunchCounty)}
                options={LAUNCH_COUNTIES.map((county) => ({ value: county, label: county }))}
                placeholder={messages.chooseOne}
                value={form.county}
              />
              <TextField error={errors.zip} inputMode="numeric" label={messages.zip} name="zip" onChange={(value) => updateField("zip", value)} value={form.zip} />
            </div>
          ) : null}

          {form.locationKind === "mobile" ? (
            <div className="field-group">
              <TextField
                error={errors.serviceZipCodes}
                inputMode="numeric"
                label={messages.serviceZips}
                name="serviceZipCodes"
                onChange={(value) => updateField("serviceZipCodes", value)}
                placeholder={messages.serviceZipsPlaceholder}
                value={form.serviceZipCodes}
              />
              <p className="field-help">{messages.serviceAreaHelp}</p>
              <div className="form-grid">
                <TextField
                  error={errors.serviceBaseZip}
                  inputMode="numeric"
                  label={messages.baseZip}
                  name="serviceBaseZip"
                  onChange={(value) => updateField("serviceBaseZip", value)}
                  placeholder={messages.optional}
                  value={form.serviceBaseZip}
                />
                <TextField
                  error={errors.serviceRadiusMiles}
                  inputMode="numeric"
                  label={messages.radius}
                  name="serviceRadiusMiles"
                  onChange={(value) => updateField("serviceRadiusMiles", value)}
                  placeholder={messages.radiusPlaceholder}
                  value={form.serviceRadiusMiles}
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="form-section" aria-labelledby="profile-info">
          <h2 id="profile-info">{messages.profile}</h2>
          <TextAreaField
            error={errors.description}
            label={messages.description}
            name="description"
            onChange={(value) => updateField("description", value)}
            value={form.description}
          />
          <TextField
            error={errors.yearsExperience}
            inputMode="numeric"
            label={messages.experience}
            name="yearsExperience"
            onChange={(value) => updateField("yearsExperience", value)}
            placeholder={messages.optional}
            value={form.yearsExperience}
          />
          <fieldset className="service-options">
            <legend>{messages.languages}</legend>
            {(["English", "Spanish"] as const).map((language) => (
              <label className="service-choice" key={language}>
                <input
                  checked={form.spokenLanguages.includes(language)}
                  onChange={() => toggleLanguage(language)}
                  type="checkbox"
                />
                <span>{language === "English" ? messages.english : messages.spanish}</span>
              </label>
            ))}
            <FieldError id="spoken-languages-error" message={errors.spokenLanguages} />
          </fieldset>
          <TextField
            error={errors.otherLanguage}
            label={messages.otherLanguage}
            name="otherLanguage"
            onChange={(value) => updateField("otherLanguage", value)}
            placeholder={messages.otherLanguagePlaceholder}
            value={form.otherLanguage}
          />
          <p className="field-help">{messages.languages}</p>
          <TextField
            label={messages.registration}
            name="registrationNumber"
            onChange={(value) => updateField("registrationNumber", value)}
            placeholder={messages.optional}
            value={form.registrationNumber}
          />
        </section>

        <section className="form-section" aria-labelledby="authorization">
          <h2 id="authorization">{messages.authorization}</h2>
          <SelectField
            error={errors.authorizationRelationship}
            label={messages.relationship}
            name="authorizationRelationship"
            onChange={(value) => updateField("authorizationRelationship", value as AuthorizationRelationship)}
            options={AUTHORIZATION_RELATIONSHIPS.map((relationship) => ({
              value: relationship,
              label: ({ myself: messages.myself, "my-business": messages.myBusiness, "family-member": messages.family, "i-work-for-this-business": messages.employee })[relationship]
            }))}
            placeholder={messages.chooseOne}
            value={form.authorizationRelationship}
          />
          <label className="service-choice">
            <input
              checked={form.authorizationAttested}
              onChange={(event) => updateField("authorizationAttested", event.target.checked)}
              type="checkbox"
            />
            <span>{messages.attest}</span>
          </label>
          <FieldError id="authorization-attested-error" message={errors.authorizationAttested} />
        </section>

        <button className="primary-action" disabled={isSubmitting} type="submit">
          {isSubmitting ? messages.submitting : messages.submit}
        </button>
      </form>
    </main>
  );
}

function TextField({
  error,
  inputMode,
  label,
  name,
  onChange,
  placeholder,
  value
}: {
  error?: string;
  inputMode?: "email" | "numeric" | "tel";
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="field-group">
      <label htmlFor={name}>{label}</label>
      <input
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        id={name}
        inputMode={inputMode}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

function TextAreaField({
  error,
  label,
  name,
  onChange,
  value
}: {
  error?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="field-group">
      <label htmlFor={name}>{label}</label>
      <textarea
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        id={name}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        value={value}
      />
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

function SelectField({
  error,
  label,
  name,
  onChange,
  options,
  placeholder,
  value
}: {
  error?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  value: string;
}) {
  return (
    <div className="field-group">
      <label htmlFor={name}>{label}</label>
      <select
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        id={name}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="field-error" id={id}>
      {message}
    </p>
  );
}
