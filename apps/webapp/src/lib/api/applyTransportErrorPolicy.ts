"use client";

import { detachPromise } from "@bondery/helpers/async";
import { handleUnauthorizedSession } from "@/lib/auth/handleUnauthorizedSession";
import { isUnauthorizedApiError, isUnauthorizedResponseStatus } from "@/lib/auth/unauthorized";

/**
 * Apply global session policy for thrown transport errors.
 * Hop-down (502/503/504 / network) stays silent here — product queries own skeleton/error UI.
 */
export function applyTransportErrorPolicy(error: unknown): void {
  if (isUnauthorizedApiError(error)) {
    detachPromise(handleUnauthorizedSession());
  }
}

/**
 * Apply global session policy for raw fetch Response objects.
 * Hop-down statuses do not change the URL or show app-wide chrome.
 */
export function applyTransportResponsePolicy(response: Response): void {
  if (isUnauthorizedResponseStatus(response.status)) {
    detachPromise(handleUnauthorizedSession());
  }
}
