"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import {
  recordMechanicSearchResultsViewed,
  recordMechanicSearchSubmitted
} from "../src/analytics/client.ts";
import {
  type Provider
} from "../src/domain/providers.ts";
import {
  EMPTY_SEARCH_FORM,
  getServiceOptions,
  VEHICLE_MAKE_OPTIONS,
  VEHICLE_YEAR_OPTIONS,
  runProviderSearch,
  type SearchFormInput,
  type SearchFieldErrors,
  type SearchResultView
} from "../src/search/search.ts";
import { formatMessage, getPublicMessages } from "../src/i18n/messages.ts";
import type { PublicLocale } from "../src/i18n/locale.ts";

const FIELD_IDS = {
  year: "vehicle-year",
  make: "vehicle-make",
  model: "vehicle-model",
  serviceCategory: "repair-service",
  zip: "customer-zip"
} as const;

export function MechanicSearchExperience({ providers, locale = "en" }: { providers: Provider[]; locale?: PublicLocale }) {
  const messages = getPublicMessages(locale);
  const serviceOptions = getServiceOptions(locale);
  const [form, setForm] = useState<SearchFormInput>(EMPTY_SEARCH_FORM);
  const [errors, setErrors] = useState<SearchFieldErrors>({});
  const [results, setResults] = useState<SearchResultView[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const hasErrors = Object.keys(errors).length > 0;

  const selectedServiceLabel = useMemo(
    () => serviceOptions.find((option) => option.value === form.serviceCategory)?.label,
    [form.serviceCategory, serviceOptions]
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
    const search = runProviderSearch(form, providers, locale);

    setHasSearched(true);
    if (!search.ok) {
      setErrors(search.errors);
      setResults(null);
      return;
    }

    setErrors({});
    setResults(search.results);
    recordMechanicSearchSubmitted({
      serviceCategory: search.request.serviceCategory,
      vehicleMake: search.request.vehicle.make,
      zip: search.request.zip
    });
    recordMechanicSearchResultsViewed({
      serviceCategory: search.request.serviceCategory,
      resultCount: search.results.length
    });
  }

  return (
    <main className="page-shell">
      <section className="search-hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">{messages.home.region}</p>
          <h1 id="page-title">{messages.home.title}</h1>
          <p className="intro">{messages.home.intro}</p>
          <Link className="provider-entry-link" href={locale === "es" ? "/es/list-your-business" : "/list-your-business"}>
            {messages.home.providerCta}
          </Link>
        </div>

        <form className="search-panel" onSubmit={handleSubmit} noValidate>
          {hasErrors ? <p className="field-error form-error-summary" role="alert">{messages.home.correctErrors}</p> : null}
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor={FIELD_IDS.year}>{messages.home.year}</label>
              <select
                id={FIELD_IDS.year}
                value={form.year}
                onChange={(event) => updateField("year", event.target.value)}
                aria-describedby={errors.year ? `${FIELD_IDS.year}-error` : undefined}
                aria-invalid={Boolean(errors.year)}
              >
                <option value="">{messages.home.selectYear}</option>
                {VEHICLE_YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <FieldError id={`${FIELD_IDS.year}-error`} message={errors.year} />
            </div>

            <div className="field-group">
              <label htmlFor={FIELD_IDS.make}>{messages.home.make}</label>
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
              <label htmlFor={FIELD_IDS.model}>{messages.home.model}</label>
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
            <legend>{messages.home.serviceNeed}</legend>
            <div className="service-grid">
              {serviceOptions.map((option) => (
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
            <label htmlFor={FIELD_IDS.zip}>{messages.home.zip}</label>
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
              {messages.home.zipHelp}
            </p>
            <FieldError id={`${FIELD_IDS.zip}-error`} message={errors.zip} />
          </div>

          <button className="primary-action" type="submit">
            {messages.home.submit}
          </button>
        </form>
      </section>

      <section className="results-section" aria-live="polite" aria-labelledby="results-title">
        <div className="results-heading">
          <p className="eyebrow">{messages.home.matches}</p>
          <h2 id="results-title">
            {hasSearched ? messages.home.recommended : messages.home.resultsPlaceholder}
          </h2>
          {hasSearched && selectedServiceLabel ? (
            <p>
              {formatMessage(messages.home.showing, { service: selectedServiceLabel, zip: form.zip })}
            </p>
          ) : (
            <p>{messages.home.searchHelp}</p>
          )}
        </div>

        {results && results.length > 0 ? (
          <div className="result-list">
            {results.map((result, index) => (
              <article className="result-card" key={result.id}>
                <div className="result-rank" aria-label={formatMessage(messages.home.result, { number: index + 1 })}>
                  {index + 1}
                </div>
                <div className="result-content">
                  <div className="result-title-row">
                    <div>
                      <p className="provider-type">{result.providerType}</p>
                      <h3>{result.name}</h3>
                    </div>
                    {result.verified ? <span className="verified-badge">{messages.home.verified}</span> : null}
                  </div>
                  <p className="result-location">{result.locationLine}</p>
                  <ul className="reason-list" aria-label={formatMessage(messages.home.whyMatch, { name: result.name })}>
                    {result.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  {result.description ? <p className="description">{result.description}</p> : null}
                  <Link className="secondary-action" href={result.profileHref}>
                    {messages.home.viewProfile}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {results && results.length === 0 ? (
          <div className="empty-state" role="status">
            <h3>{messages.home.noMatches}</h3>
            <p>{messages.home.noMatchesHelp}</p>
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
