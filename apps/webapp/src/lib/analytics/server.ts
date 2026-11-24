import { after } from "next/server";
import { PostHog } from "posthog-node";
import { WEBAPP_RUNTIME_ENV } from "../platform/runtimeConfig.env";

/**
 * Singleton PostHog Node client for server-side event capture.
 * `flushAt: 1` and `flushInterval: 0` ensure events are queued immediately;
 * `after()` flushes them after the response is sent (non-blocking).
 */
const posthogKey = process.env[WEBAPP_RUNTIME_ENV.posthogKey];
const posthogHost = process.env[WEBAPP_RUNTIME_ENV.posthogHost] ?? "https://eu.i.posthog.com";

const posthogClient = posthogKey
  ? new PostHog(posthogKey, {
      flushAt: 1,
      flushInterval: 0,
      host: posthogHost,
    })
  : null;

let serverProductAnalyticsEnabled = true;

/** PostHog event names must use `category:object_action`. */
export const PRODUCT_EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/;

/** Sync server capture guard from client-loaded settings (best-effort). */
export function setServerProductAnalyticsEnabled(enabled: boolean): void {
  serverProductAnalyticsEnabled = enabled;
}

/**
 * Captures an analytics event from a server component, server action, or route handler.
 * Uses Next.js `after()` to flush the event after the response is sent.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  if (!posthogClient || !serverProductAnalyticsEnabled) {
    return;
  }

  if (!PRODUCT_EVENT_NAME_PATTERN.test(event)) {
    return;
  }

  posthogClient.capture({ distinctId, event, properties });

  after(async () => {
    await posthogClient.flush();
  });
}
