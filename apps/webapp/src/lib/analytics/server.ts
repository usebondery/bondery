import { PostHog } from "posthog-node";
import { after } from "next/server";

/**
 * Singleton PostHog Node client for server-side event capture.
 * `flushAt: 1` and `flushInterval: 0` ensure events are queued immediately;
 * `after()` flushes them after the response is sent (non-blocking).
 */
const posthogClient = process.env.POSTHOG_KEY
  ? new PostHog(process.env.POSTHOG_KEY, {
      host: process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    })
  : null;

/**
 * Captures an analytics event from a server component, server action, or route handler.
 * Uses Next.js `after()` to flush the event after the response is sent.
 *
 * @param distinctId - The user's unique ID (Supabase user UUID).
 * @param event - The event name (e.g. "contact_created").
 * @param properties - Optional event properties. Do not include PII like names or emails.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  if (!posthogClient) return;

  posthogClient.capture({ distinctId, event, properties });

  after(async () => {
    await posthogClient.flush();
  });
}
