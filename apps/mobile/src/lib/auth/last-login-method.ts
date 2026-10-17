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

/**
 * Expo `lastLoginMethodClient` `customResolveMethod`. Maps Better Auth paths the
 * same way as the webapp plugin, including magic-link verify.
 */
export function resolveExpoLastLoginMethod(url: string | URL): string | null {
  const { pathname } = new URL(url.toString(), "http://localhost");
  if (pathname.includes("/magic-link/verify")) {
    return "magic-link";
  }

  if (pathname.includes("/passkey/verify-authentication")) {
    return "passkey";
  }

  if (pathname.includes("/callback/")) {
    const method = pathname.split("/").pop();
    return method && method.length > 0 ? method : null;
  }

  return null;
}
