"use client";

import { track } from "@vercel/analytics";

import {
  buildMechanicProfileViewedEvent,
  buildMechanicSearchResultsViewedEvent,
  buildMechanicSearchSubmittedEvent,
  buildProviderSubmissionCompletedEvent,
  buildProviderSubmissionStartedEvent,
  type AnalyticsEvent,
  type MechanicProfileViewedInput,
  type MechanicSearchResultsViewedInput,
  type MechanicSearchSubmittedInput,
  type ProviderSubmissionCompletedInput
} from "./events.ts";

export type AnalyticsSink = (event: AnalyticsEvent) => void;

export function sendAnalyticsEvent(event: AnalyticsEvent, sink: AnalyticsSink = sendVercelAnalyticsEvent): void {
  try {
    sink(event);
  } catch {
    // Product flows must never depend on analytics delivery.
  }
}

export function recordMechanicSearchSubmitted(input: MechanicSearchSubmittedInput, sink?: AnalyticsSink): void {
  sendAnalyticsEvent(buildMechanicSearchSubmittedEvent(input), sink);
}

export function recordMechanicSearchResultsViewed(input: MechanicSearchResultsViewedInput, sink?: AnalyticsSink): void {
  sendAnalyticsEvent(buildMechanicSearchResultsViewedEvent(input), sink);
}

export function recordMechanicProfileViewed(input: MechanicProfileViewedInput, sink?: AnalyticsSink): void {
  sendAnalyticsEvent(buildMechanicProfileViewedEvent(input), sink);
}

export function recordProviderSubmissionStarted(sink?: AnalyticsSink): void {
  sendAnalyticsEvent(buildProviderSubmissionStartedEvent(), sink);
}

export function recordProviderSubmissionCompleted(input: ProviderSubmissionCompletedInput, sink?: AnalyticsSink): void {
  sendAnalyticsEvent(buildProviderSubmissionCompletedEvent(input), sink);
}

function sendVercelAnalyticsEvent(event: AnalyticsEvent): void {
  track(event.name, event.properties);
}
