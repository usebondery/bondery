"use client";

import { isApiUnavailableError, isApiUnavailableResponseStatus } from "@/lib/api/availability";
import { handleApiUnavailable } from "@/lib/auth/handleApiUnavailable";
import { handleUnauthorizedSession } from "@/lib/auth/handleUnauthorizedSession";
import { isUnauthorizedApiError, isUnauthorizedResponseStatus } from "@/lib/auth/unauthorized";

/** Apply global session/outage policy for thrown transport errors. */
export function applyTransportErrorPolicy(error: unknown): void {
  if (isUnauthorizedApiError(error)) {
    void handleUnauthorizedSession();
    return;
  }
  if (isApiUnavailableError(error)) {
    handleApiUnavailable();
  }
}

/** Apply global session/outage policy for raw fetch Response objects. */
export function applyTransportResponsePolicy(response: Response): void {
  if (isUnauthorizedResponseStatus(response.status)) {
    void handleUnauthorizedSession();
    return;
  }
  if (isApiUnavailableResponseStatus(response.status)) {
    handleApiUnavailable();
  }
}
