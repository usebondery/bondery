import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { BETTER_AUTH_BASE_PATH, betterAuthPath } from "@bondery/helpers/globals/paths";
import { createRemoteJWKSet, EncryptJWT, jwtDecrypt, jwtVerify } from "jose";
import {
  joinApiUrl,
  resolvePublicApiBaseUrl,
  resolveServerApiBaseUrl,
} from "@/lib/api/resolveServerApiUrl";

const TRAILING_SLASHES = /\/+$/;

// `api:access` is the scope tied to the API's single canonical protected
// resource (see apps/api/src/lib/auth/index.ts) — omitting it, or omitting
// the `resource` parameter below, makes the AS issue a token this resource
// server will reject (enforcePerClientResources + audience check both fail
// closed on an unscoped/unresourced token).
const OAUTH_SCOPE = "openid profile email offline_access api:access";

function apiResourceIdentifier(): string {
  return resolvePublicApiBaseUrl().replace(TRAILING_SLASHES, "");
}

function oauthIssuerIdentifier(): string {
  return `${apiResourceIdentifier()}${BETTER_AUTH_BASE_PATH}`;
}
const OAUTH_FLOW_TTL_SECONDS = 10 * 60;

// 10 minutes — just long enough for the AS round-trip
const SESSION_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;

// matches refreshTokenExpiresIn default (30 days)

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function webappOAuthClientId(): string {
  return requireEnv("BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID");
}

function webappOAuthClientSecret(): string {
  return requireEnv("BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET");
}

function sessionEncryptionKey(): Uint8Array {
  return createHash("sha256").update(requireEnv("BONDERY_PRIVATE_WEBAPP_SESSION_SECRET")).digest();
}

async function requestToken(body: URLSearchParams): Promise<TokenResponse | null> {
  const payload = body.toString();
  try {
    const response = await fetch(
      joinApiUrl(resolveServerApiBaseUrl(), betterAuthPath("/oauth2/token")),
      {
        body: payload,
        cache: "no-store",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        method: "POST",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as TokenResponse;
  } catch {
    return null;
  }
}

async function requestRefreshedTokens(refreshToken: string): Promise<TokenResponse | null> {
  return requestToken(
    new URLSearchParams({
      client_id: webappOAuthClientId(),
      client_secret: webappOAuthClientSecret(),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      // Refresh requests must keep requesting the same resource explicitly —
      // omitting it must not silently widen/narrow the token's audience.
      resource: apiResourceIdentifier(),
    }),
  );
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  jwks ??= createRemoteJWKSet(
    new URL(joinApiUrl(resolveServerApiBaseUrl(), betterAuthPath("/jwks"))),
  );
  return jwks;
}

/**
 * Verifies the id_token's signature/`iss`/`aud` and returns only its protocol
 * identity (`sub`) — Better Auth 1.7 stopped putting profile/email claims on
 * authorization-code ID tokens, so `sub` is all that's trustworthy here.
 * Profile fields must come from `/oauth2/userinfo` (see `fetchUserInfo`).
 */
async function verifyIdTokenSubject(idToken: string): Promise<string> {
  const { payload } = await jwtVerify(idToken, getJwks(), {
    audience: webappOAuthClientId(),
    issuer: oauthIssuerIdentifier(),
  });

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("id_token missing sub claim");
  }
  return payload.sub;
}

type UserInfoResponse = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  sub: string;
};

/** Fetches profile claims from the AS's UserInfo endpoint using the access token. */
async function fetchUserInfo(accessToken: string): Promise<UserInfoResponse> {
  const response = await fetch(
    joinApiUrl(resolveServerApiBaseUrl(), betterAuthPath("/oauth2/userinfo")),
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    throw new Error(`userinfo request failed with status ${response.status}`);
  }
  return (await response.json()) as UserInfoResponse;
}

async function resolveSessionUserFromTokens(
  tokens: TokenResponse & { id_token: string },
): Promise<WebappSessionUser> {
  const idTokenSubject = await verifyIdTokenSubject(tokens.id_token);
  const userInfo = await fetchUserInfo(tokens.access_token);

  // The ID token's `sub` is the only protocol-verified identity; the
  // UserInfo response is fetched using the access token minted for the same
  // grant, but its `sub` must still match to rule out any mismatch.
  if (userInfo.sub !== idTokenSubject) {
    throw new Error("userinfo sub does not match id_token sub");
  }

  return {
    email: userInfo.email ?? "",
    emailVerified: userInfo.email_verified === true,
    id: idTokenSubject,
    image: userInfo.picture ?? null,
    name: userInfo.name ?? "",
  };
}

function buildSessionPayload(
  tokens: TokenResponse | null,
  user: WebappSessionUser,
  fallbackRefreshToken?: string,
): WebappSessionPayload | null {
  const accessToken = tokens?.access_token;
  const refreshToken = tokens?.refresh_token ?? fallbackRefreshToken;
  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    accessTokenExpiresAt: Math.floor(Date.now() / 1000) + (tokens?.expires_in ?? 3600),
    refreshToken,
    user,
  };
}

async function encryptPayload(
  payload: Record<string, unknown>,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .encrypt(sessionEncryptionKey());
}

async function decryptPayload<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtDecrypt(token, sessionEncryptionKey());
    return payload as unknown as T;
  } catch {
    return null;
  }
}

type CookieOptions = {
  httpOnly: true;
  maxAge: number;
  path: "/";
  sameSite: "lax";
  secure: boolean;
};

/**
 * The webapp's own OAuth-BFF client against the API's `oauth-provider` Authorization
 * Server. Independent of Better Auth's native browser session (see client.ts) — this
 * is the confidential-client credential the webapp server holds for its own RSC/BFF
 * data fetching, obtained via a real Authorization Code + PKCE exchange.
 */

export type WebappSessionUser = {
  email: string;
  emailVerified: boolean;
  id: string;
  image?: string | null;
  name: string;
};

export type WebappSessionPayload = {
  accessToken: string;
  accessTokenExpiresAt: number; // unix seconds
  refreshToken: string;
  user: WebappSessionUser;
};

export type OAuthFlowPayload = {
  codeVerifier: string;
  redirectTo: string | null;
  state: string;
};

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export function generateOAuthState(): string {
  return randomBytes(16).toString("hex");
}

/** Builds the API's own `/oauth2/authorize` URL for the webapp's confidential client. */
export function buildAuthorizeUrl(params: {
  codeChallenge: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(joinApiUrl(resolvePublicApiBaseUrl(), betterAuthPath("/oauth2/authorize")));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", webappOAuthClientId());
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", OAUTH_SCOPE);
  url.searchParams.set("resource", apiResourceIdentifier());
  return url.toString();
}

export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<TokenResponse | null> {
  return requestToken(
    new URLSearchParams({
      client_id: webappOAuthClientId(),
      client_secret: webappOAuthClientSecret(),
      code: params.code,
      code_verifier: params.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: params.redirectUri,
      resource: apiResourceIdentifier(),
    }),
  );
}

/** Exchanges an authorization code for the webapp's own session payload (unencrypted). */
export async function completeOAuthCodeExchange(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<WebappSessionPayload | null> {
  const tokens = await exchangeCodeForTokens(params);
  if (!tokens?.id_token) {
    return null;
  }
  const user = await resolveSessionUserFromTokens({ ...tokens, id_token: tokens.id_token });
  return buildSessionPayload(tokens, user);
}

/**
 * Refreshes the webapp's session payload using its stored refresh token.
 *
 * The `refresh_token` grant does not return a new `id_token` (per the
 * `oauth-provider` plugin), so the existing verified user claims carry over
 * unchanged — only the token pair rotates.
 */
export async function refreshSessionPayload(
  session: WebappSessionPayload,
): Promise<WebappSessionPayload | null> {
  const tokens = await requestRefreshedTokens(session.refreshToken);
  // Refresh grants often return only a new access_token; keep the existing refresh token.
  return buildSessionPayload(tokens, session.user, session.refreshToken);
}

export function encryptWebappSession(payload: WebappSessionPayload): Promise<string> {
  return encryptPayload(payload, SESSION_COOKIE_TTL_SECONDS);
}

export function decryptWebappSession(token: string): Promise<WebappSessionPayload | null> {
  return decryptPayload<WebappSessionPayload>(token);
}

export function encryptOAuthFlow(payload: OAuthFlowPayload): Promise<string> {
  return encryptPayload(payload, OAUTH_FLOW_TTL_SECONDS);
}

export function decryptOAuthFlow(token: string): Promise<OAuthFlowPayload | null> {
  return decryptPayload<OAuthFlowPayload>(token);
}

export function webappSessionCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, maxAge: SESSION_COOKIE_TTL_SECONDS, path: "/", sameSite: "lax", secure };
}

export function oauthFlowCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, maxAge: OAUTH_FLOW_TTL_SECONDS, path: "/", sameSite: "lax", secure };
}
