export type AuthCallbackSearchParams = {
  cookie?: string | string[] | undefined;
  error?: string | string[] | undefined;
  token?: string | string[] | undefined;
};

export type ParsedAuthCallbackSearch = {
  cookie: string | null;
  error: string | null;
  token: string | null;
};

/**
 * First non-empty Expo / Better Auth callback query value.
 * Expo Router may pass a string or string[].
 */
export function firstSearchParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  for (const entry of value) {
    const trimmed = entry.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return null;
}

/** Cookie, error, and magic-link token from a native auth callback URL. */
export function parseAuthCallbackSearch(
  params: AuthCallbackSearchParams,
): ParsedAuthCallbackSearch {
  return {
    cookie: decodeCallbackParam(firstSearchParam(params.cookie)),
    error: firstSearchParam(params.error),
    token: firstSearchParam(params.token),
  };
}

/**
 * Expo injects `?cookie=` with URLSearchParams encoding. Decode once when
 * percent-escapes are present so `getSetCookie` sees a Set-Cookie header.
 */
function decodeCallbackParam(value: string | null): string | null {
  if (!value?.includes("%")) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
