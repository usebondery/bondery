// biome-ignore-all lint/style/noExcessiveLinesPerFile: PKCE + MCP OAuth protocol share one Postgres Fastify suite
/**
 * Real-Postgres OAuth 2.1/PKCE protocol + tenant-isolation gate.
 *
 * Unlike the rest of `test:api` (which never touches a live database), this
 * suite requires `DATABASE_URL` to point at a clean, migrated Postgres — the
 * `oauthProvider` plugin seeds its resource row at boot, and the whole
 * authorization-code + refresh flow is exercised through real Fastify
 * injection against real Prisma-backed storage. Run via `pnpm run test:auth
 * -w api` (see package.json), never as part of the DB-less `test:api`.
 *
 * Requires the schema to already be migrated (`prisma migrate deploy`) —
 * this suite does not run migrations itself. Run locally after
 * `pnpm run release-migrate` (not wired in CI).
 */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import {
  betterAuthAuthorizationServerMetadataPaths,
  betterAuthOpenIdConfigurationPaths,
  betterAuthPath,
  betterAuthProtectedResourceMetadataPaths,
} from "@bondery/helpers/globals/paths";
import { generateId } from "@bondery/helpers/ids";
import type { FastifyInstance } from "fastify";
import { provisionNewUser } from "../lib/auth/provision-new-user.js";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { createTestApp } = await import("./create-test-app.js");
const {
  CIMD_CLIENT_DISCOVERY_ID,
  MCP_OAUTH_SCOPES,
  resolveApiResourceIdentifier,
  resolveBetterAuthIssuerUrl,
  resolveMcpResourceIdentifier,
  resolveMcpResourceIdentifiers,
  resolveOAuthIssuerIdentifier,
} = await import("../lib/auth/index.js");
const { resolveResourceId, provisionWebappClient, upsertMcpResources } = await import(
  "../lib/bootstrap/provision-oauth-clients.js"
);

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { challenge, verifier };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  assert.equal(parts.length, 3, "access token must be a JWT (three dot-separated segments)");
  return JSON.parse(Buffer.from(parts[1] as string, "base64url").toString("utf8"));
}

async function createTestUser(): Promise<{ id: string; email: string }> {
  const id = generateId();
  const email = `auth-integration-${id}@example.test`;
  await prisma.user.create({
    data: { email, emailVerified: true, id, name: "Auth Integration Test User" },
  });
  await provisionNewUser({ name: "Auth Integration Test User", userId: id });
  return { email, id };
}

/** Bearer-plugin-compatible raw session token — see `better-auth`'s `bearer` plugin. */
async function createNativeSession(userId: string): Promise<string> {
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

const WEBAPP_URL = (process.env.BONDERY_PUBLIC_WEBAPP_URL ?? "").replace(/\/+$/, "");
const REDIRECT_URI = `${WEBAPP_URL}/auth/oauth-callback`;
const CLIENT_ID = process.env.BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID as string;
const CLIENT_SECRET = process.env.BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET as string;
const RESOURCE = resolveApiResourceIdentifier();
const MCP_RESOURCE = resolveMcpResourceIdentifier();
const OAUTH_SCOPE = "openid profile email offline_access api:access";
const MCP_SCOPE = "openid profile email offline_access mcp:read mcp:write";
const MCP_TEST_CLIENT_ID = "mcp-auth-spike-test-client";
const CIMD_SCHEMA_CLIENT_ID = `cimd-schema-${generateId()}`;

function authorizeUrl(params: {
  challenge: string;
  resource?: string;
  scope?: string;
  state: string;
}): string {
  const url = new URL("http://test/auth/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", params.scope ?? OAUTH_SCOPE);
  if (params.resource !== undefined) {
    url.searchParams.set("resource", params.resource);
  }
  return `${url.pathname}?${url.searchParams.toString()}`;
}

async function authorize(
  app: FastifyInstance,
  sessionToken: string,
  params: { challenge: string; resource?: string; scope?: string; state: string },
) {
  return app.inject({
    headers: { authorization: `Bearer ${sessionToken}` },
    method: "GET",
    url: authorizeUrl(params),
  });
}

function extractCodeAndState(location: string): { code: string; state: string } {
  const url = new URL(location);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  assert.ok(code, `expected authorize redirect to carry a code, got: ${location}`);
  assert.ok(state, `expected authorize redirect to carry state, got: ${location}`);
  return { code, state };
}

function assertAuthorizationDenied(
  response: { body: string; headers: { location?: unknown }; statusCode: number },
  message: string,
): void {
  const location = typeof response.headers.location === "string" ? response.headers.location : "";
  if (location) {
    const url = new URL(location, "http://test.invalid");
    assert.equal(url.searchParams.get("code"), null, `${message}: issued a code at ${location}`);
    return;
  }
  assert.notEqual(response.statusCode, 200, `${message}: ${response.body}`);
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

/** MCP-only public test client (CIMD stand-in). Linked only to `{API}/mcp`. */
async function provisionMcpTestClient(): Promise<void> {
  await prisma.oauthClient.upsert({
    create: {
      clientId: MCP_TEST_CLIENT_ID,
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
    where: { clientId: MCP_TEST_CLIENT_ID },
  });

  for (const resourceId of resolveMcpResourceIdentifiers()) {
    await upsertClientResource(MCP_TEST_CLIENT_ID, resourceId);
  }
}

function mcpAuthorizeUrl(params: {
  challenge: string;
  resource?: string;
  scope?: string;
  state: string;
}): string {
  const url = new URL("http://test/auth/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", MCP_TEST_CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", params.scope ?? MCP_SCOPE);
  if (params.resource !== undefined) {
    url.searchParams.set("resource", params.resource);
  }
  return `${url.pathname}?${url.searchParams.toString()}`;
}

async function authorizeMcp(
  app: FastifyInstance,
  sessionToken: string,
  params: { challenge: string; resource?: string; scope?: string; state: string },
) {
  return app.inject({
    headers: { authorization: `Bearer ${sessionToken}` },
    method: "GET",
    url: mcpAuthorizeUrl(params),
  });
}

async function exchangeMcpCode(
  app: FastifyInstance,
  params: { code: string; codeVerifier: string; resource?: string },
) {
  const body = new URLSearchParams({
    client_id: MCP_TEST_CLIENT_ID,
    code: params.code,
    code_verifier: params.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  });
  if (params.resource !== undefined) {
    body.set("resource", params.resource);
  }

  return app.inject({
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    payload: body.toString(),
    url: "/auth/oauth2/token",
  });
}

async function exchangeCode(
  app: FastifyInstance,
  params: { code: string; codeVerifier: string; resource?: string },
) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: params.code,
    code_verifier: params.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  });
  if (params.resource !== undefined) {
    body.set("resource", params.resource);
  }

  return app.inject({
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    payload: body.toString(),
    url: "/auth/oauth2/token",
  });
}

async function refreshToken(app: FastifyInstance, refresh: string, resource?: string) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refresh,
  });
  if (resource !== undefined) {
    body.set("resource", resource);
  }

  return app.inject({
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    payload: body.toString(),
    url: "/auth/oauth2/token",
  });
}

describe("real-database OAuth 2.1 + PKCE protocol", () => {
  let app: FastifyInstance;
  const createdDcrClientIds: string[] = [];
  const createdUserIds: string[] = [];

  before(async () => {
    const resourceId = await resolveResourceId();
    await provisionWebappClient(resourceId);
    await upsertMcpResources();
    await provisionMcpTestClient();
    app = await createTestApp();
  });

  after(async () => {
    await app.close();
    const mcpClientIds = [MCP_TEST_CLIENT_ID, CIMD_SCHEMA_CLIENT_ID, ...createdDcrClientIds];
    await prisma.oauthAccessToken.deleteMany({
      where: { clientId: { in: mcpClientIds } },
    });
    await prisma.oauthRefreshToken.deleteMany({
      where: { clientId: { in: mcpClientIds } },
    });
    await prisma.oauthConsent.deleteMany({
      where: { clientId: { in: mcpClientIds } },
    });
    await prisma.oauthClientResource.deleteMany({
      where: { clientId: { in: mcpClientIds } },
    });
    await prisma.oauthClient.deleteMany({
      where: { clientId: { in: mcpClientIds } },
    });
    if (createdUserIds.length > 0) {
      await prisma.oauthAccessToken.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.oauthRefreshToken.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.oauthConsent.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.people.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("completes authorization code + S256 PKCE and issues a resource-bound JWT", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);
    const { challenge, verifier } = generatePkcePair();

    const authorizeResponse = await authorize(app, sessionToken, {
      challenge,
      resource: RESOURCE,
      state: "state-1",
    });
    assert.equal(authorizeResponse.statusCode, 302);
    const location = authorizeResponse.headers.location as string;
    const { code, state } = extractCodeAndState(location);
    assert.equal(state, "state-1");

    const tokenResponse = await exchangeCode(app, {
      code,
      codeVerifier: verifier,
      resource: RESOURCE,
    });
    assert.equal(
      tokenResponse.statusCode,
      200,
      `token exchange must not be 415/4xx (form body must survive the Fastify bridge): ${tokenResponse.body}`,
    );
    const tokens = tokenResponse.json() as {
      access_token: string;
      id_token: string;
      refresh_token: string;
      scope?: string;
    };
    assert.ok(tokens.access_token, "expected an access_token in the token response");
    assert.ok(tokens.id_token, "expected an id_token when openid was requested");
    assert.ok(tokens.refresh_token, "expected a refresh_token (offline_access requested)");
    assert.ok(
      tokens.scope?.split(" ").includes("openid"),
      `expected openid to survive resource scope intersection, got: ${tokens.scope}`,
    );

    const payload = decodeJwtPayload(tokens.access_token);
    assert.equal(payload.iss, resolveOAuthIssuerIdentifier());
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    assert.ok(audience.includes(RESOURCE), `expected resource audience, got: ${payload.aud}`);
    assert.equal(payload.azp, CLIENT_ID);
    assert.equal(payload.client_id, CLIENT_ID);
    assert.equal(payload.sub, user.id);
    assert.ok(typeof payload.exp === "number" && payload.exp > Date.now() / 1000);
    assert.ok(
      typeof payload.scope === "string" && payload.scope.split(" ").includes("api:access"),
      `expected api:access scope on the issued token, got: ${payload.scope}`,
    );

    const userInfoResponse = await app.inject({
      headers: { authorization: `Bearer ${tokens.access_token}` },
      method: "GET",
      url: "/auth/oauth2/userinfo",
    });
    assert.equal(
      userInfoResponse.statusCode,
      200,
      `UserInfo must accept the resource-bound OIDC token: ${userInfoResponse.body}`,
    );
    assert.equal((userInfoResponse.json() as { sub: string }).sub, user.id);

    const meResponse = await app.inject({
      headers: { authorization: `Bearer ${tokens.access_token}` },
      method: "GET",
      url: "/me/settings",
    });
    assert.equal(
      meResponse.statusCode,
      200,
      `resource server must accept its own issued access token: ${meResponse.body}`,
    );

    const refreshed = await refreshToken(app, tokens.refresh_token, RESOURCE);
    assert.equal(refreshed.statusCode, 200, `refresh grant failed: ${refreshed.body}`);
    const refreshedTokens = refreshed.json() as { access_token: string };
    const refreshedPayload = decodeJwtPayload(refreshedTokens.access_token);
    const refreshedAudience = Array.isArray(refreshedPayload.aud)
      ? refreshedPayload.aud
      : [refreshedPayload.aud];
    assert.ok(
      refreshedAudience.includes(RESOURCE),
      `refresh grant must remain bound to the originally requested resource, got: ${JSON.stringify(refreshedPayload.aud)}`,
    );

    const replayedRefresh = await refreshToken(app, tokens.refresh_token, RESOURCE);
    assert.notEqual(
      replayedRefresh.statusCode,
      200,
      "refreshTokenReuseInterval 0 must reject a rotated refresh token immediately",
    );

    const replay = await exchangeCode(app, { code, codeVerifier: verifier, resource: RESOURCE });
    assert.notEqual(
      replay.statusCode,
      200,
      "a replayed authorization code must not be redeemable twice (RFC 9700 family invalidation)",
    );

    const mcpWithRestToken = await app.inject({
      headers: {
        authorization: `Bearer ${tokens.access_token}`,
        "content-type": "application/json",
        "mcp-protocol-version": "2026-07-28",
      },
      method: "POST",
      payload: {
        id: 1,
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          capabilities: {},
          clientInfo: { name: "auth-spike", version: "0" },
          protocolVersion: "2025-03-26",
        },
      },
      url: "/mcp",
    });
    assert.equal(
      mcpWithRestToken.statusCode,
      401,
      `first-party REST JWT must be rejected on /mcp: ${mcpWithRestToken.body}`,
    );
    assert.ok(
      mcpWithRestToken.headers["www-authenticate"],
      "MCP 401 must include WWW-Authenticate (RFC 9728)",
    );
    assert.ok(
      mcpWithRestToken.body.includes("jsonrpc"),
      `MCP auth failures must be JSON-RPC, got: ${mcpWithRestToken.body}`,
    );
    assert.equal(
      mcpWithRestToken.body.includes('"type":'),
      false,
      "MCP must not wrap auth failures in Stripe-style REST errors",
    );
  });

  it("rejects a token issued for a different audience (wrong resource)", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);
    const { challenge } = generatePkcePair();

    const authorizeResponse = await authorize(app, sessionToken, {
      challenge,
      resource: `${RESOURCE}/unregistered-resource`,
      state: "state-2",
    });
    // enforcePerClientResources: the webapp client is only linked to the
    // canonical resource, so requesting an unlinked one must fail closed
    // rather than silently issuing an unscoped/opaque token.
    assertAuthorizationDenied(authorizeResponse, "an unlinked resource must not be authorized");
  });

  it("rejects a request missing the api:access scope from calling the resource server", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);
    const { challenge, verifier } = generatePkcePair();

    const authorizeResponse = await authorize(app, sessionToken, {
      challenge,
      scope: "openid profile email offline_access",
      state: "state-3",
    });
    assert.equal(authorizeResponse.statusCode, 302);
    const { code } = extractCodeAndState(authorizeResponse.headers.location as string);

    const tokenResponse = await exchangeCode(app, { code, codeVerifier: verifier });
    assert.equal(tokenResponse.statusCode, 200, `token exchange failed: ${tokenResponse.body}`);
    const tokens = tokenResponse.json() as { access_token: string };

    const meResponse = await app.inject({
      headers: { authorization: `Bearer ${tokens.access_token}` },
      method: "GET",
      url: "/me/settings",
    });
    assert.equal(
      meResponse.statusCode,
      401,
      "a token without api:access (no resource requested) must be rejected by the resource server",
    );
  });

  it("rejects a PKCE exchange with the wrong code_verifier", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);
    const { challenge } = generatePkcePair();
    const { verifier: wrongVerifier } = generatePkcePair();

    const authorizeResponse = await authorize(app, sessionToken, {
      challenge,
      resource: RESOURCE,
      state: "state-4",
    });
    assert.equal(authorizeResponse.statusCode, 302);
    const { code } = extractCodeAndState(authorizeResponse.headers.location as string);

    const tokenResponse = await exchangeCode(app, {
      code,
      codeVerifier: wrongVerifier,
      resource: RESOURCE,
    });
    assert.notEqual(
      tokenResponse.statusCode,
      200,
      "a mismatched code_verifier must not redeem the code",
    );
  });

  it("rejects an expired access token", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);

    const expiredPayload = {
      aud: RESOURCE,
      azp: CLIENT_ID,
      client_id: CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) - 60,
      iat: Math.floor(Date.now() / 1000) - 3600,
      iss: resolveApiResourceIdentifier(),
      scope: "api:access",
      sub: user.id,
    };
    // A syntactically JWT-shaped but unsigned/expired token: the resource
    // server must reject it (invalid signature and expiry both fail
    // closed), independent of whether the AS ever actually issued it.
    const fakeToken = [
      Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
      Buffer.from(JSON.stringify(expiredPayload)).toString("base64url"),
      "invalid-signature",
    ].join(".");

    const response = await app.inject({
      headers: { authorization: `Bearer ${fakeToken}` },
      method: "GET",
      url: "/me/settings",
    });
    assert.equal(response.statusCode, 401);
  });

  it("rejects an opaque (non-JWT) bearer token at the resource boundary", async () => {
    const response = await app.inject({
      headers: { authorization: `Bearer ${randomBytes(24).toString("hex")}` },
      method: "GET",
      url: "/me/settings",
    });
    assert.equal(response.statusCode, 401);
  });

  it("revokes a refresh token so it can no longer mint access tokens", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);
    const { challenge, verifier } = generatePkcePair();

    const authorizeResponse = await authorize(app, sessionToken, {
      challenge,
      resource: RESOURCE,
      state: "state-5",
    });
    assert.equal(authorizeResponse.statusCode, 302);
    const { code } = extractCodeAndState(authorizeResponse.headers.location as string);

    const tokenResponse = await exchangeCode(app, {
      code,
      codeVerifier: verifier,
      resource: RESOURCE,
    });
    assert.equal(tokenResponse.statusCode, 200);
    const tokens = tokenResponse.json() as { refresh_token: string };

    const revokeResponse = await app.inject({
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
      payload: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        token: tokens.refresh_token,
        token_type_hint: "refresh_token",
      }).toString(),
      url: "/auth/oauth2/revoke",
    });
    assert.equal(revokeResponse.statusCode, 200, `revoke failed: ${revokeResponse.body}`);

    const refreshAfterRevoke = await refreshToken(app, tokens.refresh_token, RESOURCE);
    assert.notEqual(
      refreshAfterRevoke.statusCode,
      200,
      "a revoked refresh token must not mint further access tokens",
    );
  });

  it("preserves repeated Set-Cookie headers across the Fastify bridge", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);
    const { challenge } = generatePkcePair();

    const authorizeResponse = await authorize(app, sessionToken, {
      challenge,
      resource: RESOURCE,
      state: "state-6",
    });
    assert.equal(authorizeResponse.statusCode, 302);
    const setCookie = authorizeResponse.headers["set-cookie"];
    assert.ok(setCookie, "expected at least one Set-Cookie header to survive the bridge");
  });

  it("resolves bearer sessions from Postgres when Redis has no cache entry", async () => {
    const { auth } = await import("../lib/auth/index.js");
    const { requireRedisCommands } = await import("../lib/data/redis.js");
    const { BETTER_AUTH_REDIS_KEY_PREFIX } = await import("../lib/auth/secondary-storage.js");

    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);

    const redis = requireRedisCommands();
    const cached = await redis.get(`${BETTER_AUTH_REDIS_KEY_PREFIX}${sessionToken}`);
    assert.equal(cached, null, "Postgres-only session must not require a Redis cache hit");

    const session = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${sessionToken}` }),
    });
    assert.equal(session?.user?.id, user.id);
  });

  it("revokes a Postgres-backed session through Better Auth sign-out", async () => {
    const { auth } = await import("../lib/auth/index.js");

    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);

    const signOutResponse = await auth.api.signOut({
      headers: new Headers({ authorization: `Bearer ${sessionToken}` }),
    });
    assert.ok(signOutResponse, "sign-out should complete for a valid bearer session");

    const session = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${sessionToken}` }),
    });
    assert.equal(session, null);

    const row = await prisma.session.findFirst({ where: { token: sessionToken } });
    assert.equal(row, null);
  });

  it("issues MCP-audience tokens without api:access and rejects them on REST", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);
    const { challenge, verifier } = generatePkcePair();

    const authorizeResponse = await authorizeMcp(app, sessionToken, {
      challenge,
      resource: MCP_RESOURCE,
      state: "mcp-1",
    });
    assert.equal(
      authorizeResponse.statusCode,
      302,
      `MCP-linked client must authorize the MCP resource: ${authorizeResponse.body}`,
    );
    const { code } = extractCodeAndState(authorizeResponse.headers.location as string);

    const tokenResponse = await exchangeMcpCode(app, {
      code,
      codeVerifier: verifier,
      resource: MCP_RESOURCE,
    });
    assert.equal(tokenResponse.statusCode, 200, `MCP token exchange failed: ${tokenResponse.body}`);
    const tokens = tokenResponse.json() as { access_token: string; scope?: string };
    const payload = decodeJwtPayload(tokens.access_token);
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    assert.ok(
      audience.includes(MCP_RESOURCE),
      `expected MCP audience ${MCP_RESOURCE}, got: ${JSON.stringify(payload.aud)}`,
    );
    assert.equal(payload.iss, resolveOAuthIssuerIdentifier());
    const scopes =
      typeof payload.scope === "string"
        ? payload.scope.split(" ")
        : typeof tokens.scope === "string"
          ? tokens.scope.split(" ")
          : [];
    assert.ok(scopes.includes("mcp:read") || scopes.includes("mcp:write"));
    assert.equal(scopes.includes("api:access"), false, "MCP tokens must never include api:access");
    assert.equal(payload.azp, MCP_TEST_CLIENT_ID);

    const restResponse = await app.inject({
      headers: { authorization: `Bearer ${tokens.access_token}` },
      method: "GET",
      url: "/me/settings",
    });
    assert.equal(
      restResponse.statusCode,
      401,
      "MCP JWT must fail REST verifyBearerToken (trusted-client filter is not a substitute)",
    );

    const mcpResponse = await app.inject({
      headers: {
        authorization: `Bearer ${tokens.access_token}`,
        "content-type": "application/json",
      },
      method: "POST",
      payload: {
        id: 1,
        jsonrpc: "2.0",
        method: "ping",
      },
      url: "/mcp",
    });
    assert.notEqual(
      mcpResponse.statusCode,
      401,
      `untrusted MCP client_id must still be accepted on /mcp (trusted-client filter off): ${mcpResponse.body}`,
    );
  });

  it("does not issue a REST-audience token to an MCP-only client", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);
    const { challenge } = generatePkcePair();

    const authorizeResponse = await authorizeMcp(app, sessionToken, {
      challenge,
      resource: RESOURCE,
      scope: OAUTH_SCOPE,
      state: "mcp-rest-denied",
    });
    assertAuthorizationDenied(
      authorizeResponse,
      "an MCP-only client must not authorize the REST resource even if it asks",
    );
  });

  it("keeps first-party clients linked only to REST resources", async () => {
    const links = await prisma.oauthClientResource.findMany({
      where: { clientId: CLIENT_ID },
    });
    assert.ok(links.length > 0, "webapp client must stay linked to REST");
    assert.equal(
      links.some((link) => link.resourceId.endsWith("/mcp")),
      false,
      "first-party provisioner must not attach the MCP resource",
    );
  });

  it("advertises RFC 8414 and OIDC metadata at canonical and alias well-known URLs", async () => {
    const issuer = resolveOAuthIssuerIdentifier();
    const asPaths = betterAuthAuthorizationServerMetadataPaths();
    const oidcPaths = betterAuthOpenIdConfigurationPaths();

    for (const path of [...asPaths, ...oidcPaths]) {
      const spoofedHost = await app.inject({
        headers: { host: "evil.example.com" },
        method: "GET",
        url: path,
      });
      assert.equal(spoofedHost.statusCode, 200, `${path}: ${spoofedHost.body}`);
      const metadata = spoofedHost.json() as {
        authorization_endpoint?: string;
        client_id_metadata_document_supported?: boolean;
        issuer?: string;
        registration_endpoint?: string;
        token_endpoint?: string;
      };
      assert.equal(metadata.issuer, issuer, path);
      assert.equal(String(metadata.issuer).includes("evil.example.com"), false, path);
      assert.ok(
        metadata.authorization_endpoint?.includes("/auth/oauth2/authorize"),
        `${path} authorization_endpoint missing: ${JSON.stringify(metadata)}`,
      );
      assert.ok(
        metadata.token_endpoint?.includes("/auth/oauth2/token"),
        `${path} token_endpoint missing: ${JSON.stringify(metadata)}`,
      );
      if (metadata.registration_endpoint || asPaths.includes(path)) {
        assert.ok(
          metadata.registration_endpoint?.includes("/auth/oauth2/register"),
          `${path} registration_endpoint missing: ${JSON.stringify(metadata)}`,
        );
      }
    }

    const canonicalAs = await app.inject({
      method: "GET",
      url: asPaths[0],
    });
    assert.equal(
      (canonicalAs.json() as { client_id_metadata_document_supported?: boolean })
        .client_id_metadata_document_supported,
      true,
    );
    assert.ok(
      resolveOAuthIssuerIdentifier().startsWith(resolveBetterAuthIssuerUrl()),
      "OAuth issuer is BONDERY_PUBLIC_API_URL plus the /auth base path",
    );
  });

  it("registers a public MCP client via DCR without REST resources", async () => {
    const response = await app.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: {
        application_type: "native",
        client_name: "Cursor DCR probe",
        grant_types: ["authorization_code", "refresh_token"],
        redirect_uris: ["http://127.0.0.1:8787/callback"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
      url: betterAuthPath("/oauth2/register"),
    });
    assert.equal(response.statusCode, 201, response.body);
    const body = response.json() as { client_id?: string };
    assert.equal(typeof body.client_id, "string");
    const clientId = body.client_id as string;
    createdDcrClientIds.push(clientId);
    const links = await prisma.oauthClientResource.findMany({ where: { clientId } });
    assert.ok(links.length > 0, "DCR client must be linked to the MCP resource");
    assert.equal(
      links.some((link) => link.resourceId.endsWith("/mcp")),
      true,
    );
    assert.equal(
      links.some((link) => !link.resourceId.endsWith("/mcp")),
      false,
      "DCR must not link REST resources",
    );
    const client = await prisma.oauthClient.findUnique({ where: { clientId } });
    assert.equal(client?.scopes.includes("api:access"), false);
  });

  it("registers Cursor-shaped DCR with a localhost HTTP callback", async () => {
    const response = await app.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: {
        application_type: "web",
        client_name: "Cursor",
        grant_types: ["authorization_code", "refresh_token"],
        redirect_uris: ["http://localhost:8787/callback"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
      url: betterAuthPath("/oauth2/register"),
    });
    assert.equal(response.statusCode, 201, response.body);
    const body = response.json() as { application_type?: string; client_id?: string };
    assert.equal(typeof body.client_id, "string");
    createdDcrClientIds.push(body.client_id as string);
    assert.equal(body.application_type, "native");

    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);
    const publicClient = await app.inject({
      headers: { authorization: `Bearer ${sessionToken}` },
      method: "GET",
      url: `${betterAuthPath("/oauth2/public-client")}?client_id=${encodeURIComponent(body.client_id as string)}`,
    });
    assert.equal(publicClient.statusCode, 200, publicClient.body);
    const publicBody = publicClient.json() as { client_name?: string };
    assert.equal(publicBody.client_name, "Cursor");
  });

  it("rejects DCR that requests the REST resource", async () => {
    const response = await app.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: {
        application_type: "native",
        client_name: "REST DCR probe",
        grant_types: ["authorization_code"],
        redirect_uris: ["http://127.0.0.1:8787/callback"],
        resources: [RESOURCE],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
      url: betterAuthPath("/oauth2/register"),
    });
    assert.notEqual(response.statusCode, 201, response.body);
  });

  it("serves RFC 9728 protected-resource metadata for /mcp", async () => {
    for (const path of betterAuthProtectedResourceMetadataPaths()) {
      const response = await app.inject({ method: "GET", url: path });
      assert.equal(response.statusCode, 200, `${path}: ${response.body}`);
      const body = response.json() as {
        authorization_servers?: string[];
        resource?: string;
        scopes_supported?: string[];
      };
      assert.equal(body.resource, MCP_RESOURCE, `${path} must advertise the MCP resource`);
      assert.ok(
        Array.isArray(body.authorization_servers) && body.authorization_servers.length === 1,
        `${path} must point at one authorization server`,
      );
    }
  });

  it("stores CIMD provenance on oauth_client.clientDiscoveryId", async () => {
    await prisma.oauthClient.create({
      data: {
        clientDiscoveryId: CIMD_CLIENT_DISCOVERY_ID,
        clientId: CIMD_SCHEMA_CLIENT_ID,
        grantTypes: ["authorization_code"],
        id: generateId(),
        name: "CIMD schema probe",
        public: true,
        redirectUris: [REDIRECT_URI],
        responseTypes: ["code"],
        scopes: [...MCP_OAUTH_SCOPES],
      },
    });
    const row = await prisma.oauthClient.findUnique({
      where: { clientId: CIMD_SCHEMA_CLIENT_ID },
    });
    assert.equal(row?.clientDiscoveryId, CIMD_CLIENT_DISCOVERY_ID);
  });

  it("aliases localhost and 127.0.0.1 for the MCP resource the same way as REST", () => {
    const mcpIds = resolveMcpResourceIdentifiers();
    assert.ok(MCP_RESOURCE.endsWith("/mcp"));
    assert.ok(mcpIds.includes(MCP_RESOURCE));
    if (RESOURCE.includes("localhost") || RESOURCE.includes("127.0.0.1")) {
      assert.ok(
        mcpIds.some((id) => id.includes("127.0.0.1") && id.endsWith("/mcp")),
        `MCP loopback aliases must keep /mcp, got: ${mcpIds.join(", ")}`,
      );
      assert.ok(
        mcpIds.some((id) => id.includes("localhost") && id.endsWith("/mcp")),
        `MCP loopback aliases must keep /mcp, got: ${mcpIds.join(", ")}`,
      );
    } else {
      assert.deepEqual(mcpIds, [MCP_RESOURCE]);
      assert.ok(!RESOURCE.endsWith("/mcp"));
    }
  });
});
