import type { PostHog } from "posthog-node";
import { getPosthogClient } from "./posthog-client.js";

export type ServerExceptionContext = {
  /** API error code from the catalog, for example `failed_to_process_webhook`. */
  code: string;
  method: string;
  requestId: string;
  /** Route pattern (`/contacts/:id`), not the requested URL, so no ids or query values leak. */
  route: string;
  statusCode: number;
};

/**
 * API errors wrap the real failure in `cause` (a Prisma or Stripe error). Report the
 * innermost one: its stack is what groups the issue and shows where it broke.
 */
export function rootCause(error: unknown): unknown {
  let current = error;
  for (let depth = 0; depth < 5; depth++) {
    const cause = (current as { cause?: unknown } | null)?.cause;
    if (!(cause instanceof Error)) {
      break;
    }
    current = cause;
  }
  return current;
}

/**
 * Reports a failed request to PostHog Error tracking. Only 5xx responses are reported:
 * a 4xx is the caller's mistake, not ours.
 *
 * No user id is attached: the event has no person profile. `request_id` links it to the
 * response the caller saw and to the matching log record.
 *
 * Never throws and is not awaited: reporting must not change the response.
 */
export function captureServerException(
  error: unknown,
  context: ServerExceptionContext,
  client: Pick<PostHog, "captureException"> | null = getPosthogClient(),
): void {
  if (!client || context.statusCode < 500) {
    return;
  }

  try {
    client.captureException(rootCause(error), undefined, {
      error_code: context.code,
      http_method: context.method,
      http_route: context.route,
      http_status_code: context.statusCode,
      request_id: context.requestId,
      service: "bondery-api",
    });
  } catch {
    // Best effort.
  }
}
