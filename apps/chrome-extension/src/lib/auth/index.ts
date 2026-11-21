/**
 * OAuth Authentication Utilities for Chrome Extension (Better Auth AS on API).
 */

import { browser } from "wxt/browser";
import { config, getOAuthResource, getOAuthTokenUrl } from "../../config";
import { extLog } from "../log";

export interface StoredTokens {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
}

export interface TokenUser {
  email: string;
  id: string;
}

/** Random bytes behind a PKCE code verifier. */
const CODE_VERIFIER_BYTES = 32;
/** A JWT is `header.payload.signature`. */
const JWT_PART_COUNT = 3;

export function generateCodeVerifier(): string {
  const array = new Uint8Array(CODE_VERIFIER_BYTES);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/[=]/g, "");
}

const STORAGE_KEY = "bondery_auth_tokens";

export async function setTokens(tokens: StoredTokens): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: tokens });
}

export async function getTokens(): Promise<StoredTokens | null> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as StoredTokens | undefined) ?? null;
}

export async function clearTokens(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens) {
    return false;
  }
  return tokens.expiresAt > Math.floor(Date.now() / 1000) + 60;
}

let refreshInFlight: Promise<StoredTokens | null> | null = null;

function buildTokenRequestBody(params: Record<string, string>): URLSearchParams {
  const body = new URLSearchParams({
    client_id: config.oauthClientId,
    resource: getOAuthResource(),
    ...params,
  });
  return body;
}

export async function refreshAccessToken(): Promise<StoredTokens | null> {
  if (refreshInFlight !== null) {
    return refreshInFlight;
  }

  const promise = performTokenRefresh();
  refreshInFlight = promise.finally(() => {
    refreshInFlight = null;
  });
  return await promise;
}

async function performTokenRefresh(): Promise<StoredTokens | null> {
  const tokens = await getTokens();
  if (!tokens?.refreshToken) {
    return null;
  }

  try {
    const response = await fetch(getOAuthTokenUrl(), {
      body: buildTokenRequestBody({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!response.ok) {
      extLog.error("[auth] Token refresh failed:", response.status);
      if (response.status >= 400 && response.status < 500) {
        await clearTokens();
      }
      return null;
    }

    const data = await response.json();

    const newTokens: StoredTokens = {
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      refreshToken: data.refresh_token ?? tokens.refreshToken,
    };

    await setTokens(newTokens);
    return newTokens;
  } catch (error) {
    extLog.error("[auth] Token refresh error:", error);
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const REFRESH_BUFFER_SECONDS = 300;

  if (tokens.expiresAt > now + REFRESH_BUFFER_SECONDS) {
    return tokens.accessToken;
  }

  const refreshed = await refreshAccessToken();
  return refreshed?.accessToken ?? null;
}

function isJwtPayload(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== JWT_PART_COUNT) {
      return null;
    }
    const payloadPart = parts[1];
    if (!payloadPart) {
      return null;
    }
    const payload = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    const parsed: unknown = JSON.parse(decoded);
    if (!isJwtPayload(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getUserFromToken(token: string): TokenUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }
  return {
    email: (payload.email as string | undefined) ?? "",
    id: (payload.sub as string | undefined) ?? "",
  };
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<StoredTokens | null> {
  try {
    const response = await fetch(getOAuthTokenUrl(), {
      body: buildTokenRequestBody({
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.text();
      extLog.error("[auth] Code exchange failed:", response.status, errorData);
      return null;
    }

    const data = await response.json();

    const tokens: StoredTokens = {
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      refreshToken: data.refresh_token,
    };

    await setTokens(tokens);
    return tokens;
  } catch (error) {
    extLog.error("[auth] Code exchange error:", error);
    return null;
  }
}
