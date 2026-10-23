export type PasskeyCeremonyKind =
  | "cancel"
  | "fail"
  | "not_found"
  | "session_stale"
  | "timeout"
  | "unsupported";

const CANCEL_CODES = new Set([
  "AbortError",
  "AUTH_CANCELLED",
  "ERROR_CEREMONY_ABORTED",
  "NotAllowedError",
  "REGISTRATION_CANCELLED",
]);

const NOT_FOUND_CODES = new Set(["PASSKEY_NOT_FOUND"]);

const SESSION_STALE_CODES = new Set(["SESSION_NOT_FRESH", "SESSION_REQUIRED"]);

const TIMEOUT_CODES = new Set(["TimeoutError"]);

/**
 * Classifies WebAuthn / Better Auth passkey client errors for inline copy vs
 * silent OS-sheet cancel.
 */
export function nativePasskeyLoginMessage(
  kind: PasskeyCeremonyKind,
  copy: {
    noPasskeyFound: string;
    passkeySignInFailed: string;
    passkeyTimedOut: string;
    passkeysUnavailableOnDevice: string;
  },
): string | null {
  if (kind === "cancel") {
    return null;
  }
  if (kind === "timeout") {
    return copy.passkeyTimedOut;
  }
  if (kind === "not_found") {
    return copy.noPasskeyFound;
  }
  if (kind === "unsupported") {
    return copy.passkeysUnavailableOnDevice;
  }
  return copy.passkeySignInFailed;
}

export function classifyPasskeyCeremonyError(error: unknown): PasskeyCeremonyKind {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  if (isTimeout(code, message)) {
    return "timeout";
  }

  if (code && CANCEL_CODES.has(code)) {
    return "cancel";
  }

  if (code && NOT_FOUND_CODES.has(code)) {
    return "not_found";
  }

  if (code && SESSION_STALE_CODES.has(code)) {
    return "session_stale";
  }

  if (code === "ERROR_AUTHFILL_NOT_SUPPORTED") {
    return "unsupported";
  }

  return "fail";
}

function isTimeout(code: string | null, message: string): boolean {
  if (code && TIMEOUT_CODES.has(code)) {
    return true;
  }

  return /\btimed?\s*out\b/i.test(message) && !/not allowed/i.test(message);
}

function getErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if ("code" in error && typeof error.code === "string" && error.code.length > 0) {
    return error.code;
  }

  if ("name" in error && typeof error.name === "string" && error.name.length > 0) {
    return error.name;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "";
  }

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "";
}
