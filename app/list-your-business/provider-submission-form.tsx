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
import { BrowserProviderSubmissionRepository } from "../../src/submissions/repository.ts";
import {
  AUTHORIZATION_RELATIONSHIPS,
  EMPTY_PROVIDER_SUBMISSION,
  type AuthorizationRelationship,
  type ProviderSubmissionInput,
  type SubmissionFieldErrors
} from "../../src/submissions/submissionTypes.ts";
import { createSubmittedProviderRecord } from "../../src/submissions/validation.ts";

const RELATIONSHIP_LABELS: Record<AuthorizationRelationship, string> = {
  myself: "Myself",
  "my-business": "My business",
  "family-member": "A family member",
  "i-work-for-this-business": "I work for this business"
};

export function ProviderSubmissionForm() {
  const [form, setForm] = useState<ProviderSubmissionInput>(EMPTY_PROVIDER_SUBMISSION);
  const [errors, setErrors] = useState<SubmissionFieldErrors>({});
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [hasStartedSubmission, setHasStartedSubmission] = useState(false);

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
  }

  function toggleServiceCounty(county: LaunchCounty) {
    markSubmissionStarted();
    setForm((current) => {
      const serviceCounties = current.serviceCounties.includes(county)
        ? current.serviceCounties.filter((item) => item !== county)
        : [...current.serviceCounties, county];
      return { ...current, serviceCounties };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createSubmittedProviderRecord(form);

    if (!result.ok) {
      setErrors(result.errors);
      setSubmittedName(null);
      return;
    }

    new BrowserProviderSubmissionRepository().save(result.record);
    setSubmittedName(result.record.businessName);
    setErrors({});
    setForm(EMPTY_PROVIDER_SUBMISSION);
    setHasStartedSubmission(false);
    recordProviderSubmissionCompleted({
      providerType: result.record.providerType,
      locationKind: result.record.locationKind
    });
  }

  return (
    <main className="page-shell provider-flow">
      <Link className="back-link" href="/">
        Back to Search
      </Link>

      <section className="profile-card">
        <p className="eyebrow">Provider submission</p>
        <h1>List your business</h1>
        <p className="intro">
          Submit a mechanic or automotive repair listing for review. Listings are not public until
          an administrator reviews and activates them.
        </p>
      </section>

      {submittedName ? (
        <section className="confirmation-panel" role="status">
          <h2>Your profile was submitted for review.</h2>
          <p>
            {submittedName} is pending review and is not public yet. We do not promise a specific
            approval time during this development milestone.
          </p>
          <Link className="secondary-action standalone-link" href="/">
            Back to Search
          </Link>
        </section>
      ) : null}

      <form className="submission-form" onSubmit={handleSubmit} noValidate>
        <section className="form-section" aria-labelledby="about-business">
          <h2 id="about-business">About you and the business</h2>
          <TextField
            error={errors.businessName}
            label="Provider or business name"
            name="businessName"
            onChange={(value) => updateField("businessName", value)}
            value={form.businessName}
          />
          <TextField
            error={errors.phone}
            inputMode="tel"
            label="Phone"
            name="phone"
            onChange={(value) => updateField("phone", value)}
            value={form.phone}
          />
          <TextField
            error={errors.email}
            inputMode="email"
            label="Email"
            name="email"
            onChange={(value) => updateField("email", value)}
            value={form.email}
          />
          <SelectField
            error={errors.providerType}
            label="Provider type"
            name="providerType"
            onChange={(value) => updateField("providerType", value as ProviderSubmissionInput["providerType"])}
            options={PROVIDER_TYPES.map((type) => ({ value: type, label: formatProviderType(type) }))}
            value={form.providerType}
          />
        </section>

        <section className="form-section" aria-labelledby="work-on">
          <h2 id="work-on">What do you work on?</h2>
          <fieldset className="service-options">
            <legend>Services</legend>
            <div className="service-grid">
              {PROVIDER_SPECIALTIES.map((service) => (
                <label className="service-choice" key={service}>
                  <input
                    checked={form.services.includes(service)}
                    onChange={() => toggleService(service)}
                    type="checkbox"
                  />
                  <span>{formatSpecialty(service)}</span>
                </label>
              ))}
            </div>
            <FieldError id="services-error" message={errors.services} />
          </fieldset>

          <fieldset className="service-options">
            <legend>Vehicle compatibility</legend>
            <label className="service-choice">
              <input
                checked={form.allMakes}
                name="allMakes"
                onChange={() => updateField("allMakes", true)}
                type="radio"
              />
              <span>All makes</span>
            </label>
            <label className="service-choice">
              <input
                checked={!form.allMakes}
                name="allMakes"
                onChange={() => updateField("allMakes", false)}
                type="radio"
              />
              <span>Selected makes</span>
            </label>
            {!form.allMakes ? (
              <TextField
                error={errors.makesServiced}
                label="Makes serviced"
                name="makesServiced"
                onChange={(value) => updateField("makesServiced", value)}
                placeholder="Honda, Toyota, Ford"
                value={form.makesServiced}
              />
            ) : null}
            <TextField
              label="Specialty makes"
              name="specialtyMakes"
              onChange={(value) => updateField("specialtyMakes", value)}
              placeholder="Optional, comma-separated"
              value={form.specialtyMakes}
            />
          </fieldset>
        </section>

        <section className="form-section" aria-labelledby="where-work">
          <h2 id="where-work">Where do you work?</h2>
          <fieldset className="service-options">
            <legend>Work location</legend>
            <label className="service-choice">
              <input
                checked={form.locationKind === "physical"}
                name="locationKind"
                onChange={() => updateField("locationKind", "physical")}
                type="radio"
              />
              <span>Physical shop</span>
            </label>
            <label className="service-choice">
              <input
                checked={form.locationKind === "mobile"}
                name="locationKind"
                onChange={() => updateField("locationKind", "mobile")}
                type="radio"
              />
              <span>Mobile mechanic</span>
            </label>
            <FieldError id="location-kind-error" message={errors.locationKind} />
          </fieldset>

          {form.locationKind === "physical" ? (
            <div className="form-grid">
              <TextField error={errors.street} label="Street address" name="street" onChange={(value) => updateField("street", value)} value={form.street} />
              <TextField error={errors.city} label="City" name="city" onChange={(value) => updateField("city", value)} value={form.city} />
              <SelectField
                error={errors.county}
                label="County"
                name="county"
                onChange={(value) => updateField("county", value as LaunchCounty)}
                options={LAUNCH_COUNTIES.map((county) => ({ value: county, label: county }))}
                value={form.county}
              />
              <TextField error={errors.zip} inputMode="numeric" label="ZIP" name="zip" onChange={(value) => updateField("zip", value)} value={form.zip} />
            </div>
          ) : null}

          {form.locationKind === "mobile" ? (
            <div className="field-group">
              <TextField
                error={errors.serviceZipCodes}
                inputMode="numeric"
                label="Service ZIP codes"
                name="serviceZipCodes"
                onChange={(value) => updateField("serviceZipCodes", value)}
                placeholder="33161, 33311"
                value={form.serviceZipCodes}
              />
              <fieldset className="service-options">
                <legend>Service counties</legend>
                {LAUNCH_COUNTIES.map((county) => (
                  <label className="service-choice" key={county}>
                    <input
                      checked={form.serviceCounties.includes(county)}
                      onChange={() => toggleServiceCounty(county)}
                      type="checkbox"
                    />
                    <span>{county}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          ) : null}
        </section>

        <section className="form-section" aria-labelledby="profile-info">
          <h2 id="profile-info">Build your profile</h2>
          <TextAreaField
            error={errors.description}
            label="Short description"
            name="description"
            onChange={(value) => updateField("description", value)}
            value={form.description}
          />
          <TextField
            label="Florida repair registration"
            name="registrationNumber"
            onChange={(value) => updateField("registrationNumber", value)}
            placeholder="Optional; submitted as unverified"
            value={form.registrationNumber}
          />
        </section>

        <section className="form-section" aria-labelledby="authorization">
          <h2 id="authorization">Authorization</h2>
          <SelectField
            error={errors.authorizationRelationship}
            label="Who is creating this profile?"
            name="authorizationRelationship"
            onChange={(value) => updateField("authorizationRelationship", value as AuthorizationRelationship)}
            options={AUTHORIZATION_RELATIONSHIPS.map((relationship) => ({
              value: relationship,
              label: RELATIONSHIP_LABELS[relationship]
            }))}
            value={form.authorizationRelationship}
          />
          <label className="service-choice">
            <input
              checked={form.authorizationAttested}
              onChange={(event) => updateField("authorizationAttested", event.target.checked)}
              type="checkbox"
            />
            <span>I am authorized to create or manage this business profile.</span>
          </label>
          <FieldError id="authorization-attested-error" message={errors.authorizationAttested} />
        </section>

        <button className="primary-action" type="submit">
          Submit for Review
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
  value
}: {
  error?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
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
        <option value="">Choose one</option>
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
