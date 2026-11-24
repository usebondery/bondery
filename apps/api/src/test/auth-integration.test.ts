/**
 * Real-Postgres OAuth 2.1/PKCE protocol + tenant-isolation gate.
 *
 * Unlike the rest of `test:api` (which never touches a live database), this suite requires
 * `DATABASE_URL` to point at a clean, migrated Postgres — the `oauthProvider` plugin seeds its
 * resource row at boot, and the whole authorization-code + refresh flow is exercised through
 * real Fastify injection against real Prisma-backed storage. Run via `pnpm run test:auth -w api`
 * (see package.json), never as part of the DB-less `test:api`.
 *
 * Requires the schema to already be migrated (`prisma migrate deploy`) — this suite does not run
 * migrations itself. Run locally after `pnpm run release-migrate` (not wired in CI).
 *
 * MCP-audience tokens, client registration, and discovery metadata live in
 * `auth-mcp-protocol-integration.test.ts`.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { createTestApp } = await import("./create-test-app.js");
const { prisma } = await import("@bondery/db");
const { MCP_RESOURCE, resolveApiResourceIdentifier, resolveOAuthIssuerIdentifier } = await import(
  "../lib/auth/index.js"
);
const { resolveResourceId, provisionWebappClient, upsertMcpResources } = await import(
  "../lib/bootstrap/provision-oauth-clients.js"
);
const {
  CLIENT_ID,
  CLIENT_SECRET,
  MCP_TEST_CLIENT_ID,
  RESOURCE,
  authorize,
  createNativeSession,
  createTestUser,
  decodeJwtPayload,
  deleteOAuthClientsAndUsers,
  exchangeCode,
  extractCodeAndState,
  generatePkcePair,
  isAuthorizationDenied,
  provisionMcpTestClient,
  refreshToken,
} = await import("./auth-test-harness.js");

describe("real-database OAuth 2.1 + PKCE protocol", () => {
  let app: FastifyInstance;
  const createdUserIds: string[] = [];

  before(async () => {
    const resourceId = await resolveResourceId();
    await provisionWebappClient(resourceId);
    await upsertMcpResources();
    await provisionMcpTestClient(MCP_TEST_CLIENT_ID);
    app = await createTestApp();
  });

  after(async () => {
    await app.close();
    await deleteOAuthClientsAndUsers([MCP_TEST_CLIENT_ID], createdUserIds);
  });

  async function newSession(): Promise<string> {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    return createNativeSession(user.id);
  }

  it("completes authorization code + S256 PKCE and issues a resource-bound JWT", async () => {
    const sessionToken = await newSession();
    const { challenge, verifier } = generatePkcePair();

    const authorizeResponse = await authorize(app, sessionToken, {
      challenge,
      resource: RESOURCE,
      state: "state-1",
    });
    assert.equal(authorizeResponse.statusCode, 302);
    const { code, state } = extractCodeAndState(authorizeResponse.headers.location as string);
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
    assert.equal(typeof payload.sub, "string");
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
    assert.equal((userInfoResponse.json() as { sub: string }).sub, payload.sub);

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
    const sessionToken = await newSession();
    const { challenge } = generatePkcePair();

    const authorizeResponse = await authorize(app, sessionToken, {
      challenge,
      resource: `${RESOURCE}/unregistered-resource`,
      state: "state-2",
    });
    // enforcePerClientResources: the webapp client is only linked to the
    // canonical resource, so requesting an unlinked one must fail closed
    // rather than silently issuing an unscoped/opaque token.
    assert.ok(
      isAuthorizationDenied(authorizeResponse),
      `an unlinked resource must not be authorized: ${authorizeResponse.headers.location ?? authorizeResponse.body}`,
    );
  });

  it("rejects a request missing the api:access scope from calling the resource server", async () => {
    const sessionToken = await newSession();
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
    const sessionToken = await newSession();
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
    const sessionToken = await newSession();
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
    const sessionToken = await newSession();
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
    const { BETTER_AUTH_REDIS_KEY_PREFIX } = await import("../lib/auth/secondary-storage.js");
    const { requireRedisCommands } = await import("../lib/data/redis.js");

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

  it("does not issue a REST-audience token to an MCP-only client", async () => {
    const { authorizeMcp } = await import("./auth-test-harness.js");
    const sessionToken = await newSession();
    const { challenge } = generatePkcePair();

    const authorizeResponse = await authorizeMcp(app, sessionToken, MCP_TEST_CLIENT_ID, {
      challenge,
      resource: RESOURCE,
      state: "mcp-rest-denied",
    });
    assert.ok(
      isAuthorizationDenied(authorizeResponse),
      `an MCP-only client must not authorize the REST resource even if it asks: ${authorizeResponse.headers.location ?? authorizeResponse.body}`,
    );
  });

  it("serves RFC 9728 protected-resource metadata for /mcp", async () => {
    const { betterAuthProtectedResourceMetadataPaths } = await import(
      "@bondery/helpers/globals/paths"
    );
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
});
