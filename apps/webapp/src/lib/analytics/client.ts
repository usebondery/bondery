"use client";

import posthog from "posthog-js";

export { posthog };

/**
 * Captures an analytics event from a client component.
 * Posthog-js is initialized in `instrumentation-client.ts` — this is just a
 * thin re-export so client components get a consistent import path.
 *
 * @param event - The event name (e.g. "contact_created").
 * @param properties - Optional event properties. Do not include PII like names or emails.
 */
export function captureEvent(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}
