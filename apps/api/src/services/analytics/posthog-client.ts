import { type EventMessage, PostHog } from "posthog-node";
import { isTestEnvironment } from "../../lib/platform/runtime-env.js";
import { scrubEmails } from "../../lib/platform/telemetry/redact.js";

const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";

let client: PostHog | null | undefined;

/**
 * Removes email addresses from the messages of an `$exception` event. Error messages
 * come from databases, mail servers and SDKs, and can quote an address. Other events
 * pass through unchanged.
 */
export function scrubExceptionEvent(event: EventMessage | null): EventMessage | null {
  if (event?.event !== "$exception") {
    return event;
  }

  const exceptions = event.properties?.$exception_list;
  if (!Array.isArray(exceptions)) {
    return event;
  }

  return {
    ...event,
    properties: {
      ...event.properties,
      $exception_list: exceptions.map((exception: unknown) => {
        const value = (exception as { value?: unknown } | null)?.value;
        return typeof value === "string"
          ? Object.assign({}, exception as object, { value: scrubEmails(value) })
          : exception;
      }),
    },
  };
}

/**
 * The one PostHog client for the API process, or `null` when no project key is set
 * (local dev, self-hosted) or in tests.
 *
 * Exception autocapture reports uncaught exceptions and unhandled rejections.
 * Request failures are reported by `captureServerException`.
 */
export function getPosthogClient(): PostHog | null {
  if (client !== undefined) {
    return client;
  }

  const key = process.env.BONDERY_PUBLIC_POSTHOG_KEY ?? "";
  client =
    key && !isTestEnvironment()
      ? new PostHog(key, {
          beforeSend: scrubExceptionEvent,
          enableExceptionAutocapture: true,
          flushAt: 1,
          flushInterval: 0,
          host: process.env.BONDERY_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST,
        })
      : null;

  return client;
}

/** Sends anything still queued. Call once when the server stops. */
export async function shutdownPosthog(): Promise<void> {
  const current = client;
  client = undefined;
  if (!current) {
    return;
  }

  try {
    await current.shutdown();
  } catch {
    // Best effort: a failed final flush must not block process exit.
  }
}
