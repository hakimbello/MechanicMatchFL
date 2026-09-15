"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import {
  EMPTY_SEARCH_FORM,
  SERVICE_OPTIONS,
  VEHICLE_MAKE_OPTIONS,
  VEHICLE_YEAR_OPTIONS,
  runProviderSearch,
  type SearchFormInput,
  type SearchFieldErrors,
  type SearchResultView
} from "../src/search/search.ts";

const FIELD_IDS = {
  year: "vehicle-year",
  make: "vehicle-make",
  model: "vehicle-model",
  serviceCategory: "repair-service",
  zip: "customer-zip"
} as const;

export function MechanicSearchExperience() {
  const [form, setForm] = useState<SearchFormInput>(EMPTY_SEARCH_FORM);
  const [errors, setErrors] = useState<SearchFieldErrors>({});
  const [results, setResults] = useState<SearchResultView[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const selectedServiceLabel = useMemo(
    () => SERVICE_OPTIONS.find((option) => option.value === form.serviceCategory)?.label,
    [form.serviceCategory]
  );

  function updateField(field: keyof SearchFormInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = runProviderSearch(form);

    setHasSearched(true);
    if (!search.ok) {
      setErrors(search.errors);
      setResults(null);
      return;
    }

    setErrors({});
    setResults(search.results);
  }

  return (
    <main className="page-shell">
      <section className="search-hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">Miami-Dade and Broward</p>
          <h1 id="page-title">Find the right mechanic for your car.</h1>
          <p className="intro">
            MechanicMatchFL helps South Florida drivers find relevant local repair providers based on
            vehicle, repair need, and ZIP code.
          </p>
        </div>

        <form className="search-panel" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor={FIELD_IDS.year}>Year</label>
              <select
                id={FIELD_IDS.year}
                value={form.year}
                onChange={(event) => updateField("year", event.target.value)}
                aria-describedby={errors.year ? `${FIELD_IDS.year}-error` : undefined}
                aria-invalid={Boolean(errors.year)}
              >
                <option value="">Select year</option>
                {VEHICLE_YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <FieldError id={`${FIELD_IDS.year}-error`} message={errors.year} />
            </div>

            <div className="field-group">
              <label htmlFor={FIELD_IDS.make}>Make</label>
              <input
                id={FIELD_IDS.make}
                name="make"
                list="vehicle-makes"
                value={form.make}
                onChange={(event) => updateField("make", event.target.value)}
                placeholder="Honda"
                aria-describedby={errors.make ? `${FIELD_IDS.make}-error` : undefined}
                aria-invalid={Boolean(errors.make)}
              />
              <datalist id="vehicle-makes">
                {VEHICLE_MAKE_OPTIONS.map((make) => (
                  <option key={make} value={make} />
                ))}
              </datalist>
              <FieldError id={`${FIELD_IDS.make}-error`} message={errors.make} />
            </div>

            <div className="field-group">
              <label htmlFor={FIELD_IDS.model}>Model</label>
              <input
                id={FIELD_IDS.model}
                name="model"
                value={form.model}
                onChange={(event) => updateField("model", event.target.value)}
                placeholder="Accord"
                aria-describedby={errors.model ? `${FIELD_IDS.model}-error` : undefined}
                aria-invalid={Boolean(errors.model)}
              />
              <FieldError id={`${FIELD_IDS.model}-error`} message={errors.model} />
            </div>
          </div>

          <fieldset className="service-options" aria-describedby={errors.serviceCategory ? "service-error" : undefined}>
            <legend>Repair or service need</legend>
            <div className="service-grid">
              {SERVICE_OPTIONS.map((option) => (
                <label className="service-choice" key={option.value}>
                  <input
                    type="radio"
                    name="serviceCategory"
                    value={option.value}
                    checked={form.serviceCategory === option.value}
                    onChange={(event) => updateField("serviceCategory", event.target.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <FieldError id="service-error" message={errors.serviceCategory} />
          </fieldset>

          <div className="field-group zip-field">
            <label htmlFor={FIELD_IDS.zip}>ZIP code</label>
            <input
              id={FIELD_IDS.zip}
              name="zip"
              value={form.zip}
              onChange={(event) => updateField("zip", event.target.value)}
              inputMode="numeric"
              maxLength={5}
              placeholder="33161"
              aria-describedby={errors.zip ? `${FIELD_IDS.zip}-error` : "zip-help"}
              aria-invalid={Boolean(errors.zip)}
            />
            <p id="zip-help" className="field-help">
              Enter a Miami-Dade or Broward ZIP.
            </p>
            <FieldError id={`${FIELD_IDS.zip}-error`} message={errors.zip} />
          </div>

          <button className="primary-action" type="submit">
            Find My Mechanic
          </button>
        </form>
      </section>

      <section className="results-section" aria-live="polite" aria-labelledby="results-title">
        <div className="results-heading">
          <p className="eyebrow">Matches</p>
          <h2 id="results-title">
            {hasSearched ? "Recommended mechanics" : "Your results will appear here"}
          </h2>
          {hasSearched && selectedServiceLabel ? (
            <p>
              Showing providers for {selectedServiceLabel} near {form.zip}.
            </p>
          ) : (
            <p>Search by vehicle, repair need, and ZIP code to see relevant providers.</p>
          )}
        </div>

        {results && results.length > 0 ? (
          <div className="result-list">
            {results.map((result, index) => (
              <article className="result-card" key={result.id}>
                <div className="result-rank" aria-label={`Result ${index + 1}`}>
                  {index + 1}
                </div>
                <div className="result-content">
                  <div className="result-title-row">
                    <div>
                      <p className="provider-type">{result.providerType}</p>
                      <h3>{result.name}</h3>
                    </div>
                    {result.verified ? <span className="verified-badge">Verified</span> : null}
                  </div>
                  <p className="result-location">{result.locationLine}</p>
                  <ul className="reason-list" aria-label={`Why ${result.name} is a match`}>
                    {result.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  {result.description ? <p className="description">{result.description}</p> : null}
                  <Link className="secondary-action" href={result.profileHref}>
                    View Profile
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {results && results.length === 0 ? (
          <div className="empty-state" role="status">
            <h3>No matching mechanics found for this search yet.</h3>
            <p>Try a different repair need, vehicle make, or ZIP code.</p>
          </div>
        ) : null}
      </section>
    </main>
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
