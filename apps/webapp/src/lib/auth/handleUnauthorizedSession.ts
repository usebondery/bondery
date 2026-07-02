"use client";

export { isUnauthorizedApiError, isUnauthorizedResponseStatus } from "@/lib/auth/unauthorized";
import { endSession } from "@/lib/auth/endSession";

/**
 * Clears client caches, ends the local Supabase session, and redirects to login.
 * Call when the API reports an expired or invalid session (401 / BFF_UNAUTHORIZED).
 */
export async function handleUnauthorizedSession(): Promise<void> {
  return endSession({ reason: "session_expired" });
}
