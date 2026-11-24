const MAGIC_LINK_VERIFY_ERROR_CODES = new Set([
  "FAILED_TO_CREATE_SESSION",
  "FAILED_TO_CREATE_USER",
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "failed_to_create_session",
  "failed_to_create_user",
]);

export type AnalyticsLoginMethod = "email" | "oauth_github" | "oauth_linkedin" | "passkey";

/**
 * Better Auth `lastLoginMethod` stores OAuth callback ids (`github`, `linkedin`),
 * `"passkey"` after `/passkey/verify-authentication`, and `"magic-link"` after
 * `/magic-link/verify`.
 */
export function isLastUsedOAuthProvider(
  lastMethod: string | null,
  provider: "github" | "linkedin",
): boolean {
  if (!lastMethod) {
    return false;
  }

  if (provider === "github") {
    return lastMethod === "github";
  }

  return lastMethod === "linkedin" || lastMethod === "linkedin_oidc";
}

export function isLastUsedPasskey(lastMethod: string | null): boolean {
  return lastMethod === "passkey";
}

export function isLastUsedMagicLink(lastMethod: string | null): boolean {
  return lastMethod === "magic-link";
}

export function isMagicLinkVerifyErrorCode(code: string | null): code is string {
  return Boolean(code && MAGIC_LINK_VERIFY_ERROR_CODES.has(code));
}

export function resolveAnalyticsLoginMethod(
  lastMethod: string | null,
): AnalyticsLoginMethod | undefined {
  if (lastMethod === "magic-link") {
    return "email";
  }

  if (lastMethod === "passkey") {
    return "passkey";
  }

  if (lastMethod === "github") {
    return "oauth_github";
  }

  if (lastMethod === "linkedin" || lastMethod === "linkedin_oidc") {
    return "oauth_linkedin";
  }

  return undefined;
}
