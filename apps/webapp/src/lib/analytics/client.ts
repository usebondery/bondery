"use client";

import posthog from "posthog-js";

import {
  isAnalyticsCaptureAllowed,
  isBrowserDntEnabled,
  setProductAnalyticsPreference,
  syncBrowserDntState,
} from "./preference";

export { default as posthog } from "posthog-js";

/** PostHog event names must use `category:object_action`. */
export const PRODUCT_EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/u;

/**
 * Applies PostHog opt-in/opt-out based on browser DNT and the user's preference.
 */
export function applyPostHogConsentState(productAnalyticsEnabled: boolean): void {
  syncBrowserDntState();
  setProductAnalyticsPreference(productAnalyticsEnabled);

  if (!posthog.__loaded) {
    return;
  }

  if (isBrowserDntEnabled() || !productAnalyticsEnabled) {
    posthog.opt_out_capturing();
    return;
  }

  posthog.opt_in_capturing();
}

/**
 * Captures an analytics event from a client component.
 * Posthog-js is initialized in `instrumentation-client.ts` — this is just a
 * thin re-export so client components get a consistent import path.
 */
export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (!PRODUCT_EVENT_NAME_PATTERN.test(event)) {
    return;
  }

  if (!isAnalyticsCaptureAllowed() || !posthog.__loaded) {
    return;
  }

  posthog.capture(event, properties);
}
