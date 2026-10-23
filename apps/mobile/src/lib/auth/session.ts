export type AuthRequiredReason = "missing_local_session" | "session_revoked";

export type EndLocalSessionReason = "account_deleted" | "session_expired" | "user_initiated";

export type TransportFailureKind =
  | "aborted"
  | "missing_local_session"
  | "network"
  | "protocol_mismatch"
  | "session_revoked";

const SESSION_TOKEN_COOKIE_NAMES = [
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
] as const;

export class AuthRequiredError extends Error {
  readonly reason: AuthRequiredReason;

  constructor(reason: AuthRequiredReason) {
    super(reason);
    this.name = "AuthRequiredError";
    this.reason = reason;
  }
}

type LocalSessionEndedListener = (reason: EndLocalSessionReason) => void;

const localSessionEndedListeners = new Set<LocalSessionEndedListener>();

let isSigningOutLocally = false;

function decodeCookiePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCookiePairs(cookieHeader: string): Map<string, string> {
  const pairs = new Map<string, string>();
  let header = cookieHeader.trim();
  if (!header) {
    return pairs;
  }

  if (!header.includes("=") && /%[0-9a-fA-F]{2}/.test(header)) {
    header = decodeCookiePart(header);
  }

  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const name = decodeCookiePart(trimmed.slice(0, separator).trim());
    const value = decodeCookiePart(trimmed.slice(separator + 1).trim());
    if (name) {
      pairs.set(name, value);
    }
  }

  return pairs;
}

/**
 * Read the opaque Better Auth session token from a Cookie header string.
 * Expo `getCookie()` already drops expired store entries.
 */
export function parseSessionTokenFromCookieHeader(cookieHeader: string): string | null {
  const pairs = parseCookiePairs(cookieHeader);
  for (const name of SESSION_TOKEN_COOKIE_NAMES) {
    const value = pairs.get(name);
    if (value) {
      return value;
    }
  }

  return null;
}

export function resolveBootAuthGate(input: {
  isAuthenticated: boolean;
  cookieToken: string | null | undefined;
  cookieReadTimedOut: boolean;
}): { isReady: boolean; hasLocalCredential: boolean } {
  const hasCookie = typeof input.cookieToken === "string" && input.cookieToken.length > 0;
  const cookieKnown = input.cookieToken !== undefined;
  const hasLocalCredential = input.isAuthenticated || hasCookie;
  const isReady = hasLocalCredential || cookieKnown || input.cookieReadTimedOut;

  return { hasLocalCredential, isReady };
}

function getErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }

  const status = error.status;
  return typeof status === "number" ? status : null;
}

function isAbortFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("name" in error && error.name === "AbortError") {
    return true;
  }

  return "code" in error && error.code === "ABORT_ERR";
}

export function classifyTransportFailure(error: unknown): TransportFailureKind {
  if (error instanceof AuthRequiredError) {
    return error.reason;
  }

  if (isAbortFailure(error)) {
    return "aborted";
  }

  const status = getErrorStatus(error);
  if (status === 401) {
    return "session_revoked";
  }

  if (status === 426) {
    return "protocol_mismatch";
  }

  return "network";
}

export function logLocalSessionMissing(): void {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return;
  }

  // biome-ignore lint/suspicious/noConsole: auth miss is not a sync outage
  console.log("[auth]", "local_session_missing");
}

export function subscribeLocalSessionEnded(listener: LocalSessionEndedListener): () => void {
  localSessionEndedListeners.add(listener);
  return () => {
    localSessionEndedListeners.delete(listener);
  };
}

function notifyLocalSessionEnded(reason: EndLocalSessionReason): void {
  for (const listener of localSessionEndedListeners) {
    listener(reason);
  }
}

/**
 * Local credential only. Does not call `getSession()`.
 */
export async function readLocalAccessToken(): Promise<string | null> {
  const { authClient } = await import("./client");
  if (!authClient) {
    return null;
  }

  const cookieHeader = await authClient.getCookie();
  return parseSessionTokenFromCookieHeader(cookieHeader);
}

/**
 * Tear down the local Better Auth session. Stack.Protected handles redirect.
 */
export async function endLocalSession({
  reason,
}: {
  reason: EndLocalSessionReason;
}): Promise<void> {
  if (isSigningOutLocally) {
    return;
  }

  const { authClient } = await import("./client");
  if (!authClient) {
    return;
  }

  isSigningOutLocally = true;
  try {
    notifyLocalSessionEnded(reason);
    const result = await authClient.signOut();
    if (reason === "user_initiated" && result.error) {
      throw result.error;
    }
  } finally {
    isSigningOutLocally = false;
  }
}
