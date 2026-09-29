/**
 * Verify a Bondery-issued OAuth access JWT without hairpinning to
 * `BONDERY_PUBLIC_API_URL`.
 *
 * `@better-auth/oauth-provider/resource-client` defaults `jwksUrl` to
 * `${baseURL}${basePath}/jwks` and fetches it over HTTP. That works after
 * `listen()`, but inject-only tests (and Traefik hairpin at boot — see
 * `verifyAuthRuntime`) never hit this process. `auth.handler` serves the
 * same JWKS in-process.
 */

import { betterAuthPath } from "@bondery/helpers/globals/paths";
import {
  createInsufficientScopeError,
  getDpopJktFromPayload,
  verifyJwsAccessToken,
} from "better-auth/oauth2";
import { APIError } from "better-call";
import { type JSONWebKeySet, type JWTPayload, errors as joseErrors } from "jose";
import { auth, resolveBetterAuthIssuerUrl, resolveOAuthIssuerIdentifier } from "./index.js";

const AUTH_JWKS_CACHE_KEY = {};

async function fetchAuthJwks(): Promise<JSONWebKeySet> {
  const url = `${resolveBetterAuthIssuerUrl()}${betterAuthPath("/jwks")}`;
  const response = await auth.handler(
    new Request(url, { headers: { accept: "application/json" }, method: "GET" }),
  );
  if (!response.ok) {
    throw new APIError("UNAUTHORIZED", { message: "invalid access token" });
  }
  return (await response.json()) as JSONWebKeySet;
}

function assertRequiredScopes(payload: JWTPayload, requiredScopes: readonly string[]): void {
  if (requiredScopes.length === 0) {
    return;
  }
  const granted = typeof payload.scope === "string" ? payload.scope.split(" ").filter(Boolean) : [];
  const grantedSet = new Set(granted);
  const missingScopes = requiredScopes.filter((scope) => !grantedSet.has(scope));
  if (missingScopes.length > 0) {
    throw createInsufficientScopeError(missingScopes);
  }
}

function toAccessTokenError(error: unknown): never {
  if (error instanceof APIError) {
    throw error;
  }
  if (error instanceof joseErrors.JWTExpired) {
    throw new APIError("UNAUTHORIZED", { message: "token expired" });
  }
  throw new APIError("UNAUTHORIZED", { message: "invalid access token" });
}

export async function verifyBonderyAccessJwt(
  token: string,
  options: {
    audience: string | string[];
    requiredScopes: readonly string[];
  },
): Promise<JWTPayload> {
  try {
    const payload = await verifyJwsAccessToken(token, {
      jwksCacheKey: AUTH_JWKS_CACHE_KEY,
      jwksFetch: fetchAuthJwks,
      verifyOptions: {
        audience: options.audience,
        issuer: resolveOAuthIssuerIdentifier(),
      },
    });

    if (getDpopJktFromPayload(payload)) {
      throw new APIError("UNAUTHORIZED", {
        error: "invalid_token",
        error_description: "DPoP-bound access token requires verifyAccessTokenRequest",
        message: "DPoP-bound access token requires verifyAccessTokenRequest",
      });
    }

    assertRequiredScopes(payload, options.requiredScopes);
    return payload;
  } catch (error) {
    toAccessTokenError(error);
  }
}
