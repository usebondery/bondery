import { isApiError } from "@bondery/helpers/api";
import { classifyPasskeyCeremonyError } from "@/lib/auth/passkey-ceremony";

export function isSessionStaleError(error: unknown): boolean {
  if (classifyPasskeyCeremonyError(error) === "session_stale") {
    return true;
  }

  return isApiError(error) && error.code === "session_not_fresh";
}
