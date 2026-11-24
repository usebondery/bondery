"use client";

import { endSession } from "@/lib/auth/endSession";

export { isUnauthorizedApiError, isUnauthorizedResponseStatus } from "@/lib/auth/unauthorized";

/**
 * Clears client caches, ends the local session, and redirects to login.
 * Call when the API reports an expired or invalid session (401 / auth_required).
 */
export async function handleUnauthorizedSession(): Promise<void> {
  return endSession({ reason: "session_expired" });
}
