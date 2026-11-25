/**
 * Real-Postgres MCP OAuth protocol coverage: MCP-audience token issuance, client registration,
 * DCR retirement, and discovery metadata. The OAuth 2.1/PKCE core lives in
 * `auth-integration.test.ts` and shares the same `test:auth` harness and migration requirements.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { createTestApp } = await import("./create-test-app.js");
const { prisma } = await import("@bondery/db");
const { betterAuthPath } = await import("@bondery/helpers/globals/paths");
const { generateId } = await import("@bondery/helpers/ids");
const {
  CIMD_CLIENT_DISCOVERY_ID,
  MCP_OAUTH_SCOPES,
  resolveBetterAuthIssuerUrl,
  resolveOAuthIssuerIdentifier,
} = await import("../lib/auth/index.js");
const { resolveResourceId, provisionWebappClient, upsertMcpResources } = await import(
  "../lib/bootstrap/provision-oauth-clients.js"
);
const { disableDcrOAuthClients } = await import("../lib/bootstrap/disable-dcr-oauth-clients.js");
const {
  CLIENT_ID,
  MCP_RESOURCE,
  MCP_SCOPE,
  MCP_TEST_CLIENT_ID,
  OAUTH_SCOPE,
  RESOURCE,
  authorizeMcp,
  createNativeSession,
  createTestUser,
  decodeJwtPayload,
  deleteOAuthClientsAndUsers,
  exchangeMcpCode,
  extractCodeAndState,
  generatePkcePair,
  isAuthorizationDenied,
  provisionMcpTestClient,
} = await import("./auth-test-harness.js");

const CIMD_SCHEMA_CLIENT_ID = `cimd-schema-${generateId()}`;

const DCR_PROBE_PAYLOADS = [
  {
    application_type: "native",
    client_name: "REST DCR probe",
    grant_types: ["authorization_code"],
    redirect_uris: ["http://127.0.0.1:8787/callback"],
    resources: [RESOURCE],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  },
  {
    application_type: "web",
    client_name: "Cursor",
    grant_types: ["authorization_code", "refresh_token"],
    redirect_uris: ["http://localhost:8787/callback"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  },
];

describe("real-database MCP OAuth protocol", () => {
  let app: FastifyInstance;
  const createdDcrClientIds: string[] = [];
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
    await deleteOAuthClientsAndUsers(
      [MCP_TEST_CLIENT_ID, CIMD_SCHEMA_CLIENT_ID, ...createdDcrClientIds],
      createdUserIds,
    );
  });

  async function newSession(): Promise<string> {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    return createNativeSession(user.id);
  }

  it("issues MCP-audience tokens without api:access and rejects them on REST", async () => {
    const sessionToken = await newSession();
    const { challenge, verifier } = generatePkcePair();

    const authorizeResponse = await authorizeMcp(app, sessionToken, MCP_TEST_CLIENT_ID, {
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

    const tokenResponse = await exchangeMcpCode(app, MCP_TEST_CLIENT_ID, {
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
    const resolveScopes = () => {
      if (typeof payload.scope === "string") {
        return payload.scope.split(" ");
      }
      if (typeof tokens.scope === "string") {
        return tokens.scope.split(" ");
      }
      return [];
    };
    const scopes = resolveScopes();
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

  it("advertises RFC 8414 and OIDC metadata at canonical and alias well-known URLs", async () => {
    const { betterAuthAuthorizationServerMetadataPaths, betterAuthOpenIdConfigurationPaths } =
      await import("@bondery/helpers/globals/paths");
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
      assert.ok(
        !metadata.registration_endpoint,
        `${path} must omit registration_endpoint: ${JSON.stringify(metadata)}`,
      );
    }

    const canonicalAs = await app.inject({ method: "GET", url: asPaths[0] });
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

  it("rejects POST /oauth2/register including Cursor-shaped loopback payloads", async () => {
    for (const payload of DCR_PROBE_PAYLOADS) {
      const response = await app.inject({
        headers: { "content-type": "application/json" },
        method: "POST",
        payload,
        url: betterAuthPath("/oauth2/register"),
      });
      assert.notEqual(response.statusCode, 201, response.body);
    }
  });

  it("disables DCR clients, revokes their tokens, and deletes consents", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const dcrClientId = `dcr-retire-${generateId()}`;
    const cimdKeepClientId = `cimd-keep-${generateId()}`;
    createdDcrClientIds.push(dcrClientId, cimdKeepClientId);

    await prisma.oauthClient.create({
      data: {
        clientId: dcrClientId,
        grantTypes: ["authorization_code", "refresh_token"],
        id: generateId(),
        name: "DCR retire probe",
        public: true,
        redirectUris: ["https://webapp.example.test/auth/oauth-callback"],
        responseTypes: ["code"],
        scopes: [...MCP_OAUTH_SCOPES],
      },
    });
    await prisma.oauthClient.create({
      data: {
        clientDiscoveryId: CIMD_CLIENT_DISCOVERY_ID,
        clientId: cimdKeepClientId,
        grantTypes: ["authorization_code", "refresh_token"],
        id: generateId(),
        name: "CIMD keep probe",
        public: true,
        redirectUris: ["https://webapp.example.test/auth/oauth-callback"],
        responseTypes: ["code"],
        scopes: [...MCP_OAUTH_SCOPES],
      },
    });

    for (const clientId of [dcrClientId, cimdKeepClientId, CLIENT_ID]) {
      await seedClientCredentials(clientId, user.id);
    }

    const result = await disableDcrOAuthClients();
    assert.ok(result.clientIds.includes(dcrClientId));
    assert.equal(result.clientIds.includes(cimdKeepClientId), false);
    assert.equal(result.clientIds.includes(CLIENT_ID), false);
    assert.equal(result.clientIds.includes(MCP_TEST_CLIENT_ID), false);

    const dcr = await prisma.oauthClient.findUnique({ where: { clientId: dcrClientId } });
    const cimd = await prisma.oauthClient.findUnique({ where: { clientId: cimdKeepClientId } });
    const firstParty = await prisma.oauthClient.findUnique({ where: { clientId: CLIENT_ID } });
    const mcpStandIn = await prisma.oauthClient.findUnique({
      where: { clientId: MCP_TEST_CLIENT_ID },
    });
    assert.equal(dcr?.disabled, true);
    assert.equal(cimd?.disabled, false);
    assert.equal(firstParty?.disabled, false);
    assert.equal(mcpStandIn?.disabled, false);

    const dcrAccess = await prisma.oauthAccessToken.findMany({ where: { clientId: dcrClientId } });
    const dcrRefresh = await prisma.oauthRefreshToken.findMany({
      where: { clientId: dcrClientId },
    });
    assert.ok(dcrAccess.every((row) => row.revoked instanceof Date));
    assert.ok(dcrRefresh.every((row) => row.revoked instanceof Date));
    assert.equal(await prisma.oauthConsent.count({ where: { clientId: dcrClientId } }), 0);

    const keptScope = { clientId: { in: [cimdKeepClientId, CLIENT_ID] }, userId: user.id };
    const keptAccess = await prisma.oauthAccessToken.findMany({ where: keptScope });
    const keptRefresh = await prisma.oauthRefreshToken.findMany({ where: keptScope });
    assert.ok(keptAccess.length >= 2);
    assert.ok(keptRefresh.length >= 2);
    assert.ok(keptAccess.every((row) => row.revoked === null));
    assert.ok(keptRefresh.every((row) => row.revoked === null));
    assert.equal(await prisma.oauthConsent.count({ where: keptScope }), 2);
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
        redirectUris: ["https://webapp.example.test/auth/oauth-callback"],
        responseTypes: ["code"],
        scopes: [...MCP_OAUTH_SCOPES],
      },
    });
    const row = await prisma.oauthClient.findUnique({
      where: { clientId: CIMD_SCHEMA_CLIENT_ID },
    });
    assert.equal(row?.clientDiscoveryId, CIMD_CLIENT_DISCOVERY_ID);
  });

  const mcpResourceIsLoopback = RESOURCE.includes("localhost") || RESOURCE.includes("127.0.0.1");

  it("aliases localhost and 127.0.0.1 for the MCP resource the same way as REST", {
    skip: !mcpResourceIsLoopback,
  }, async () => {
    const { resolveMcpResourceIdentifiers } = await import("../lib/auth/index.js");
    const mcpIds = resolveMcpResourceIdentifiers();
    assert.ok(MCP_RESOURCE.endsWith("/mcp"));
    assert.ok(mcpIds.includes(MCP_RESOURCE));
    assert.ok(
      mcpIds.some((id) => id.includes("127.0.0.1") && id.endsWith("/mcp")),
      `MCP loopback aliases must keep /mcp, got: ${mcpIds.join(", ")}`,
    );
    assert.ok(
      mcpIds.some((id) => id.includes("localhost") && id.endsWith("/mcp")),
      `MCP loopback aliases must keep /mcp, got: ${mcpIds.join(", ")}`,
    );
  });

  it("uses a single MCP resource identifier off loopback", {
    skip: mcpResourceIsLoopback,
  }, async () => {
    const { resolveMcpResourceIdentifiers } = await import("../lib/auth/index.js");
    const mcpIds = resolveMcpResourceIdentifiers();
    assert.ok(MCP_RESOURCE.endsWith("/mcp"));
    assert.ok(mcpIds.includes(MCP_RESOURCE));
    assert.deepEqual(mcpIds, [MCP_RESOURCE]);
    assert.ok(!RESOURCE.endsWith("/mcp"));
  });

  it("lets an MCP-only client authorize the MCP resource only", async () => {
    const sessionToken = await newSession();
    const { challenge } = generatePkcePair();

    const restAsk = await authorizeMcp(app, sessionToken, MCP_TEST_CLIENT_ID, {
      challenge,
      resource: RESOURCE,
      scope: OAUTH_SCOPE,
      state: "mcp-rest-ask",
    });
    assert.ok(
      isAuthorizationDenied(restAsk),
      `an MCP-only client must not authorize the REST resource: ${restAsk.headers.location ?? restAsk.body}`,
    );

    const mcpAsk = await authorizeMcp(app, sessionToken, MCP_TEST_CLIENT_ID, {
      challenge,
      resource: MCP_RESOURCE,
      scope: MCP_SCOPE,
      state: "mcp-only",
    });
    assert.equal(mcpAsk.statusCode, 302, mcpAsk.body);
  });

  async function seedClientCredentials(clientId: string, userId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.oauthAccessToken.create({
      data: {
        clientId,
        expiresAt,
        id: generateId(),
        scopes: ["mcp:read"],
        token: `access-${generateId()}`,
        userId,
      },
    });
    await prisma.oauthRefreshToken.create({
      data: {
        clientId,
        expiresAt,
        id: generateId(),
        scopes: ["mcp:read"],
        token: `refresh-${generateId()}`,
        userId,
      },
    });
    await prisma.oauthConsent.create({
      data: {
        clientId,
        id: generateId(),
        scopes: ["mcp:read"],
        userId,
      },
    });
  }
});
