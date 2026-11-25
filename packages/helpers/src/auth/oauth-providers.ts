import {
  type OAuthProviderId,
  type OAuthProvidersBitmap,
  oauthProvidersResponseSchema,
} from "@bondery/schemas/oauth-providers";

export type { OAuthProviderId, OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";

/**
 * Parse `GET /oauth-providers`. Returns null when the payload is missing or
 * malformed so clients can fail open.
 */
export function parseOAuthProvidersResponse(value: unknown): OAuthProvidersBitmap | null {
  const parsed = oauthProvidersResponseSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return parsed.data.oauthProviders;
}

/**
 * Only an explicit `{ [provider]: false }` disables that IdP. Null, missing,
 * or a network failure must leave the button enabled (hosted GitHub stay on).
 */
export function isOAuthProviderEnabled(
  bitmap: OAuthProvidersBitmap | null | undefined,
  provider: OAuthProviderId,
): boolean {
  return bitmap?.[provider] !== false;
}

/**
 * Only an explicit `{ email: false }` disables magic-link sign-in. Null, missing,
 * or a network failure must leave the button enabled (fail-open).
 */
export function isEmailSignInEnabled(bitmap: OAuthProvidersBitmap | null | undefined): boolean {
  return bitmap?.email !== false;
}

export function areAllOAuthProvidersDisabled(
  bitmap: OAuthProvidersBitmap | null | undefined,
): boolean {
  return !isOAuthProviderEnabled(bitmap, "github") && !isOAuthProviderEnabled(bitmap, "linkedin");
}

export type { OAuthProvidersResponse } from "@bondery/schemas/oauth-providers";
