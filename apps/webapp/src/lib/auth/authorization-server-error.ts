import { buildOAuthLoginHref } from "@/lib/auth/magic-link-urls";

/**
 * `/oauth2/authorize` failures Better Auth cannot send to `redirect_uri`
 * (see getErrorURL in @better-auth/oauth-provider). `onAPIError.errorURL`
 * is `/login` so webapp IdP errors still land on the BFF gate; these codes
 * must be forwarded to `/oauth/login` or an existing webapp session dumps
 * the chrome.identity popup onto `/app/home`.
 */
const OAUTH_AUTHORIZATION_SERVER_ERROR_CODES = new Set([
  "client_disabled",
  "invalid_client",
  "invalid_redirect",
  "unauthorized_client",
  "unsupported_prompt_select_account",
  "unsupported_response_type",
]);

export type NextSearchParamValue = string | string[] | undefined;

export type NextSearchParams = {
  error?: NextSearchParamValue;
} & Record<string, NextSearchParamValue>;

export function isOAuthAuthorizationServerError(code: string | null | undefined): boolean {
  return Boolean(code && OAUTH_AUTHORIZATION_SERVER_ERROR_CODES.has(code));
}

export function firstNextSearchParam(value: NextSearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function searchStringFromNextParams(params: NextSearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, item);
      }
    } else {
      search.set(key, value);
    }
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export function resolveAuthorizationServerErrorHref(params: NextSearchParams): string | null {
  if (!isOAuthAuthorizationServerError(firstNextSearchParam(params.error))) {
    return null;
  }

  return buildOAuthLoginHref(searchStringFromNextParams(params));
}
