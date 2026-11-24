const TIMED_OUT_I = /\btimed?\s*out\b/i;
const NOT_ALLOWED_I = /not allowed/i;

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

function isTimeout(code: string | null, message: string): boolean {
  if (code && TIMEOUT_CODES.has(code)) {
    return true;
  }

  return TIMED_OUT_I.test(message) && !NOT_ALLOWED_I.test(message);
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

export type PasskeyCeremonyKind =
  | "cancel"
  | "fail"
  | "not_found"
  | "session_stale"
  | "timeout"
  | "unsupported";

/**
 * Classifies WebAuthn / Better Auth passkey client errors for toast vs silent cancel.
 */
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

export function getPasskeyErrorCode(error: unknown): string | null {
  return getErrorCode(error);
}

export type PasskeyLoginCopyKey =
  | "NoPasskeyFound"
  | "PasskeySignInFailed"
  | "PasskeyTimedOut"
  | "PasskeysUnavailable";

/** Login toast key, or `null` when the OS sheet was cancelled (no toast). */
export function getPasskeyLoginCopyKey(kind: PasskeyCeremonyKind): PasskeyLoginCopyKey | null {
  switch (kind) {
    case "cancel":
      return null;
    case "timeout":
      return "PasskeyTimedOut";
    case "not_found":
      return "NoPasskeyFound";
    case "unsupported":
      return "PasskeysUnavailable";
    default:
      return "PasskeySignInFailed";
  }
}
