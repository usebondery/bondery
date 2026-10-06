/**
 * Public Better Auth resource identifiers and OAuth scopes.
 */
import type { passkey } from "@better-auth/passkey";
import { resolveWebAuthnRp } from "@bondery/helpers/auth/resolve-webauthn-rp";
import { API_ROUTES, BETTER_AUTH_BASE_PATH } from "@bondery/helpers/globals/paths";
import { buildAuthTranslations } from "./build-auth-translations.js";
import { withLoopbackUrlAlias } from "./loopback-alias-urls.js";

export const authTranslations = buildAuthTranslations();

export function resolveWebappUrl(): string {
  return (process.env.BONDERY_PUBLIC_WEBAPP_URL ?? "").replace(/\/+$/, "");
}

/**
 * Canonical protected-resource identifier for this API, per RFC 8707
 * (`BONDERY_PUBLIC_API_URL`). First-party clients should request this exact
 * `resource` value. `enforcePerClientResources` also requires a client link
 * via `oauthClientResource` (see scripts/provision-oauth-clients.ts).
 */
export function resolveApiResourceIdentifier(): string {
  return (process.env.BONDERY_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
}

/**
 * Canonical identifier plus the localhost ↔ 127.0.0.1 alias used by Chrome
 * identity and Node IPv4 fetches. Production hosts are a single-element list.
 */
export function resolveApiResourceIdentifiers(): string[] {
  return withLoopbackUrlAlias(resolveApiResourceIdentifier());
}

/** JWT `aud` check: string in production, both loopback aliases locally. */
export function resolveApiResourceAudience(): string | string[] {
  const identifiers = resolveApiResourceIdentifiers();
  return identifiers.length === 1 ? (identifiers[0] ?? "") : identifiers;
}

export const API_ACCESS_SCOPE = "api:access";
export const MCP_READ_SCOPE = "mcp:read";
export const MCP_WRITE_SCOPE = "mcp:write";

export const OIDC_SCOPES = ["openid", "profile", "email", "offline_access"] as const;

export const OAUTH_PROVIDER_SCOPES = [...OIDC_SCOPES, API_ACCESS_SCOPE] as const;

export const MCP_OAUTH_SCOPES = [...OIDC_SCOPES, MCP_READ_SCOPE, MCP_WRITE_SCOPE] as const;

/** Better Auth CIMD `clientDiscoveryId` stored on discovered clients. */
export const CIMD_CLIENT_DISCOVERY_ID = "cimd";

/**
 * Canonical MCP protected-resource identifier (`{API}/mcp`).
 * Same origin as REST; path `/mcp`. Loopback aliases keep `/mcp`.
 */
export function resolveMcpResourceIdentifier(): string {
  const api = resolveApiResourceIdentifier();
  return api ? `${api}${API_ROUTES.MCP}` : "";
}

export function resolveMcpResourceIdentifiers(): string[] {
  return withLoopbackUrlAlias(resolveMcpResourceIdentifier());
}

/** JWT `aud` check for MCP: string in production, both loopback aliases locally. */
export function resolveMcpResourceAudience(): string | string[] {
  const identifiers = resolveMcpResourceIdentifiers();
  return identifiers.length === 1 ? (identifiers[0] ?? "") : identifiers;
}

export function resolveTrustedOAuthClientIds(): Set<string> | undefined {
  const clientIds = [
    process.env.BONDERY_PUBLIC_OAUTH_CLIENT_ID?.trim(), // chrome-extension
    process.env.BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID?.trim(), // webapp BFF
  ].filter((value): value is string => Boolean(value));
  return clientIds.length > 0 ? new Set(clientIds) : undefined;
}

export function resolveAuthErrorPageUrl(): string {
  const webappUrl = resolveWebappUrl();
  return webappUrl ? `${webappUrl}/login` : "";
}

/**
 * The Better Auth issuer is the API's own domain — the auth server's identity
 * must not be borrowed from one of its own clients. OAuth callbacks (GitHub/
 * LinkedIn), the JWT `iss` claim, and the session cookie are all derived from
 * this. `loginPage`/`consentPage` below still point at the webapp — that's the
 * browser-facing UI, a separate concern from the issuer identity.
 */
export function resolveBetterAuthIssuerUrl(): string {
  const apiUrl = (process.env.BONDERY_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
  if (apiUrl) {
    return apiUrl;
  }

  return resolveWebappUrl();
}

/** OAuth/OIDC issuer advertised by Better Auth for this non-root base path. */
export function resolveOAuthIssuerIdentifier(): string {
  const baseUrl = resolveBetterAuthIssuerUrl();
  return baseUrl ? `${baseUrl}${BETTER_AUTH_BASE_PATH}` : "";
}

export function resolveUseSecureCookies(): boolean {
  return resolveBetterAuthIssuerUrl().startsWith("https://");
}

/**
 * Always register the plugin so Better Auth infers passkey + OAuth/API-key
 * endpoints. IP webapp hosts cannot be a WebAuthn rpID; fall back to localhost
 * so boot succeeds and ceremonies fail closed on origin mismatch.
 */
export function resolveWebAuthnRpConfig(): { origin: string; rpID: string } {
  const webAuthnRp = resolveWebAuthnRp({
    rpIdOverride: process.env.BONDERY_PUBLIC_WEBAUTHN_RP_ID,
    webappUrl: process.env.BONDERY_PUBLIC_WEBAPP_URL,
  });

  return webAuthnRp.ok
    ? { origin: webAuthnRp.origin, rpID: webAuthnRp.rpID }
    : { origin: "http://localhost", rpID: "localhost" };
}

/**
 * Better Auth 1.7.1 `mergeSchema` only remaps existing field names. Assign so
 * adapter `transformOutput` keeps `lastUsedAt` on `listUserPasskeys`.
 */
export function withPasskeyLastUsedAtField(
  plugin: ReturnType<typeof passkey>,
): ReturnType<typeof passkey> {
  Object.assign(plugin.schema.passkey.fields, {
    lastUsedAt: { required: false, type: "date" },
  });
  return plugin;
}
