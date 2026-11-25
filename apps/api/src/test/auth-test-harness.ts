/**
 * Shared harness for the OAuth 2.1 / PKCE suites that drive the authorization server over
 * Fastify inject against a real Postgres.
 *
 * Requires `DATABASE_URL` to point at a clean, migrated Postgres. The `oauthProvider` plugin
 * seeds its resource row at boot. Run via `pnpm run test:auth -w api`, never the DB-less
 * `test:api` suite. See `auth-integration.test.ts` for the full requirements.
 */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";
import type { FastifyInstance } from "fastify";
import {
  CIMD_CLIENT_DISCOVERY_ID,
  MCP_OAUTH_SCOPES,
  resolveApiResourceIdentifier,
  resolveMcpResourceIdentifier,
  resolveMcpResourceIdentifiers,
} from "../lib/auth/index.js";
import { provisionNewUser } from "../lib/auth/provision-new-user.js";

function isJwtPayload(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function upsertClientResource(clientId: string, resourceId: string): Promise<void> {
  const existing = await prisma.oauthClientResource.findFirst({ where: { clientId, resourceId } });
  if (existing) {
    return;
  }
  await prisma.oauthClientResource.create({
    data: { clientId, id: generateId(), resourceId },
  });
}

function authorizeUrlFor(
  clientId: string,
  params: { challenge: string; resource?: string; scope?: string; state: string },
  fallbackScope: string,
): string {
  const url = new URL("http://test/auth/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", params.scope ?? fallbackScope);
  if (params.resource !== undefined) {
    url.searchParams.set("resource", params.resource);
  }
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function tokenRequestBody(
  client: { clientId: string; clientSecret?: string },
  params: { code?: string; codeVerifier?: string; refreshToken?: string; resource?: string },
): URLSearchParams {
  const body = new URLSearchParams({ client_id: client.clientId });
  if (client.clientSecret !== undefined) {
    body.set("client_secret", client.clientSecret);
  }
  if (params.code !== undefined) {
    body.set("code", params.code);
    body.set("code_verifier", params.codeVerifier ?? "");
    body.set("grant_type", "authorization_code");
    body.set("redirect_uri", REDIRECT_URI);
  }
  if (params.refreshToken !== undefined) {
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", params.refreshToken);
  }
  if (params.resource !== undefined) {
    body.set("resource", params.resource);
  }
  return body;
}

export const WEBAPP_URL = (process.env["BONDERY_PUBLIC_WEBAPP_URL"] ?? "").replace(/\/+$/u, "");
export const REDIRECT_URI = `${WEBAPP_URL}/auth/oauth-callback`;
export const CLIENT_ID = process.env["BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID"] as string;
export const CLIENT_SECRET = process.env["BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET"] as string;
export const RESOURCE = resolveApiResourceIdentifier();
export const MCP_RESOURCE = resolveMcpResourceIdentifier();
export const OAUTH_SCOPE = "openid profile email offline_access api:access";
export const MCP_SCOPE = "openid profile email offline_access mcp:read mcp:write";

export const CIMD_DISCOVERY_ID = CIMD_CLIENT_DISCOVERY_ID;

export function base64url(input: Buffer): string {
  return input.toString("base64url");
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { challenge, verifier };
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  assert.equal(parts.length, 3, "access token must be a JWT (three dot-separated segments)");
  const payload: unknown = JSON.parse(
    Buffer.from(parts[1] as string, "base64url").toString("utf8"),
  );
  assert.ok(isJwtPayload(payload), "JWT payload must be a JSON object");
  if (!isJwtPayload(payload)) {
    throw new Error("JWT payload must be a JSON object");
  }
  return payload;
}

export async function createTestUser(
  label = "Auth Integration Test",
): Promise<{ email: string; id: string }> {
  const id = generateId();
  const email = `auth-integration-${id}@example.test`;
  const name = `${label} User`;
  await prisma.user.create({ data: { email, emailVerified: true, id, name } });
  await provisionNewUser({ name, userId: id });
  return { email, id };
}

/** Bearer-plugin-compatible raw session token — see `better-auth`'s `bearer` plugin. */
export async function createNativeSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      token,
      userId,
    },
  });
  return token;
}

/** MCP-only public test client (CIMD stand-in). Linked only to the MCP resources. */
export async function provisionMcpTestClient(clientId: string): Promise<void> {
  await prisma.oauthClient.upsert({
    create: {
      clientDiscoveryId: CIMD_DISCOVERY_ID,
      clientId,
      clientSecret: null,
      grantTypes: ["authorization_code", "refresh_token"],
      id: generateId(),
      name: "MCP spike test client",
      public: true,
      redirectUris: [REDIRECT_URI],
      requirePKCE: true,
      responseTypes: ["code"],
      scopes: [...MCP_OAUTH_SCOPES],
      skipConsent: true,
      tokenEndpointAuthMethod: "none",
      type: "user-agent-based",
    },
    update: {
      clientDiscoveryId: CIMD_DISCOVERY_ID,
      disabled: false,
      grantTypes: ["authorization_code", "refresh_token"],
      public: true,
      redirectUris: [REDIRECT_URI],
      requirePKCE: true,
      responseTypes: ["code"],
      scopes: [...MCP_OAUTH_SCOPES],
      skipConsent: true,
      tokenEndpointAuthMethod: "none",
    },
    where: { clientId },
  });
  for (const resourceId of resolveMcpResourceIdentifiers()) {
    await upsertClientResource(clientId, resourceId);
  }
}

export async function authorize(
  app: FastifyInstance,
  sessionToken: string,
  params: { challenge: string; resource?: string; scope?: string; state: string },
) {
  return app.inject({
    headers: { authorization: `Bearer ${sessionToken}` },
    method: "GET",
    url: authorizeUrlFor(CLIENT_ID, params, OAUTH_SCOPE),
  });
}

export async function authorizeMcp(
  app: FastifyInstance,
  sessionToken: string,
  clientId: string,
  params: { challenge: string; resource?: string; scope?: string; state: string },
) {
  return app.inject({
    headers: { authorization: `Bearer ${sessionToken}` },
    method: "GET",
    url: authorizeUrlFor(clientId, params, MCP_SCOPE),
  });
}

export function extractCodeAndState(location: string): { code: string; state: string } {
  const url = new URL(location);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  assert.ok(code, `expected authorize redirect to carry a code, got: ${location}`);
  assert.ok(state, `expected authorize redirect to carry state, got: ${location}`);
  return { code, state };
}

export function isAuthorizationDenied(response: {
  headers: { location?: unknown };
  statusCode: number;
}): boolean {
  const location = typeof response.headers.location === "string" ? response.headers.location : "";
  if (location) {
    return new URL(location, "http://test.invalid").searchParams.get("code") === null;
  }
  return response.statusCode !== 200;
}

export async function exchangeCode(
  app: FastifyInstance,
  params: { code: string; codeVerifier: string; resource?: string },
) {
  return app.inject({
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    payload: tokenRequestBody(
      { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET },
      params,
    ).toString(),
    url: "/auth/oauth2/token",
  });
}

export async function exchangeMcpCode(
  app: FastifyInstance,
  clientId: string,
  params: { code: string; codeVerifier: string; resource?: string },
) {
  return app.inject({
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    payload: tokenRequestBody({ clientId }, params).toString(),
    url: "/auth/oauth2/token",
  });
}

export async function refreshToken(app: FastifyInstance, refresh: string, resource?: string) {
  return app.inject({
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    payload: tokenRequestBody(
      { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET },
      { refreshToken: refresh, resource },
    ).toString(),
    url: "/auth/oauth2/token",
  });
}

/** Delete the OAuth rows a suite created. Call from `after()`. */
export async function deleteOAuthClientsAndUsers(
  clientIds: string[],
  userIds: string[],
): Promise<void> {
  await prisma.oauthAccessToken.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.oauthRefreshToken.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.oauthConsent.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.oauthClientResource.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.oauthClient.deleteMany({ where: { clientId: { in: clientIds } } });
  if (userIds.length > 0) {
    await prisma.oauthAccessToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.oauthRefreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.oauthConsent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.people.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}
