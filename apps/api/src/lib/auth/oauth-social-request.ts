import { betterAuthPath } from "@bondery/helpers/globals/paths";
import type { OAuthProviderId, OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";

function normalizePath(url: string): string {
  const path = url.split("?")[0] ?? url;
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function readProviderId(body: unknown): OAuthProviderId | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const { provider } = body as Record<string, unknown>;
  if (provider === "github" || provider === "linkedin") {
    return provider;
  }

  return null;
}

export const BETTER_AUTH_SIGN_IN_SOCIAL_PATH = betterAuthPath("/sign-in/social");
export const BETTER_AUTH_LINK_SOCIAL_PATH = betterAuthPath("/link-social");

/** Better Auth client `signIn.social` / `linkSocial` POST paths under `/auth`. */
export function isSocialOAuthMutationPath(url: string): boolean {
  const path = normalizePath(url);
  return path === BETTER_AUTH_SIGN_IN_SOCIAL_PATH || path === BETTER_AUTH_LINK_SOCIAL_PATH;
}

/**
 * Returns the social provider to reject when this request would start IdP
 * sign-in or link and the boot snapshot says that provider is off.
 */
export function resolveUnconfiguredSocialOAuthProvider(
  method: string,
  url: string,
  body: unknown,
  snapshot: OAuthProvidersBitmap,
): OAuthProviderId | null {
  if (method !== "POST" || !isSocialOAuthMutationPath(url)) {
    return null;
  }

  const provider = readProviderId(body);
  if (!provider) {
    return null;
  }

  if (snapshot[provider]) {
    return null;
  }

  return provider;
}
