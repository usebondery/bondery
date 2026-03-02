/**
 * OAuth Authentication Utilities for Chrome Extension
 *
 * Handles PKCE generation, token storage/retrieval in browser.storage.local,
 * and token refresh logic for the Supabase OAuth 2.1 flow.
 */

import { config } from "../config";
import { browser } from "wxt/browser";

/** Shape of stored auth tokens */
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

/** Decoded minimal JWT payload for display purposes */
export interface TokenUser {
  id: string;
  email: string;
}

// ─── PKCE Helpers ────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random code verifier (43–128 characters).
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Create a SHA-256 code challenge from a code verifier.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64URLEncode(new Uint8Array(hash));
}

/**
 * Base64-URL encode a byte array (no padding).
 */
function base64URLEncode(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ─── Token Storage ───────────────────────────────────────────────────────────

const STORAGE_KEY = "bondery_auth_tokens";

/**
 * Persist OAuth tokens in browser.storage.local.
 */
export async function setTokens(tokens: StoredTokens): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: tokens });
}

/**
 * Retrieve stored tokens, or null if none exist.
 */
export async function getTokens(): Promise<StoredTokens | null> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as StoredTokens) ?? null;
}

/**
 * Clear all stored tokens (logout).
 */
export async function clearTokens(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY);
}

/**
 * Check whether a non-expired access token exists.
 */
export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens) return false;
  // Consider expired if within 60 seconds of expiry
  return tokens.expiresAt > Math.floor(Date.now() / 1000) + 60;
}

// ─── Token Refresh ───────────────────────────────────────────────────────────

/**
 * Refresh the access token using the stored refresh token.
 * Returns the new tokens, or null if refresh fails.
 */
export async function refreshAccessToken(): Promise<StoredTokens | null> {
  const tokens = await getTokens();
  if (!tokens?.refreshToken) return null;

  try {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
        client_id: config.oauthClientId,
      }),
    });

    if (!response.ok) {
      console.error("[auth] Token refresh failed:", response.status);
      // If refresh fails with 4xx, tokens are likely revoked
      if (response.status >= 400 && response.status < 500) {
        await clearTokens();
      }
      return null;
    }

    const data = await response.json();

    const newTokens: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    };

    await setTokens(newTokens);
    return newTokens;
  } catch (error) {
    console.error("[auth] Token refresh error:", error);
    return null;
  }
}

/**
 * Get a valid access token, refreshing proactively if near expiry.
 * Returns null if no valid token can be obtained.
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;

  const now = Math.floor(Date.now() / 1000);
  const REFRESH_BUFFER_SECONDS = 300; // refresh 5 min before expiry

  // Token still valid and not near expiry
  if (tokens.expiresAt > now + REFRESH_BUFFER_SECONDS) {
    return tokens.accessToken;
  }

  // Token expired or near expiry — try refresh
  const refreshed = await refreshAccessToken();
  return refreshed?.accessToken ?? null;
}

// ─── JWT Decode (minimal) ────────────────────────────────────────────────────

/**
 * Decode a JWT payload without verification (for display only).
 * Do NOT use this for security decisions — the service worker trusts
 * the Supabase token endpoint, not client-side decoding.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Extract basic user info from a JWT access token.
 */
export function getUserFromToken(token: string): TokenUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return {
    id: (payload.sub as string) ?? "",
    email: (payload.email as string) ?? "",
  };
}

// ─── OAuth Flow ──────────────────────────────────────────────────────────────

/**
 * Exchange an authorization code for tokens using the Supabase OAuth token endpoint.
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<StoredTokens | null> {
  try {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.oauthClientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[auth] Code exchange failed:", response.status, errorData);
      return null;
    }

    const data = await response.json();

    const tokens: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    };

    await setTokens(tokens);
    return tokens;
  } catch (error) {
    console.error("[auth] Code exchange error:", error);
    return null;
  }
}
