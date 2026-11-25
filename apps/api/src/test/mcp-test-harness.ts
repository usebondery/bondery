/**
 * Shared harness for the `test:auth` suites that drive the MCP endpoint over Fastify inject.
 *
 * These helpers need a migrated Postgres. See `auth-integration.test.ts` for the environment
 * and migration requirements.
 */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";
import type { FastifyInstance } from "fastify";
import {
  CIMD_CLIENT_DISCOVERY_ID,
  MCP_OAUTH_SCOPES,
  resolveMcpResourceIdentifier,
  resolveMcpResourceIdentifiers,
} from "../lib/auth/index.js";
import { provisionNewUser } from "../lib/auth/provision-new-user.js";

async function upsertClientResource(clientId: string, resourceId: string): Promise<void> {
  const existing = await prisma.oauthClientResource.findFirst({ where: { clientId, resourceId } });
  if (existing) {
    return;
  }
  await prisma.oauthClientResource.create({
    data: { clientId, id: generateId(), resourceId },
  });
}

function extractCode(location: string): string {
  const code = new URL(location).searchParams.get("code");
  assert.ok(code, `expected code in ${location}`);
  return code;
}

export const WEBAPP_URL = (process.env["BONDERY_PUBLIC_WEBAPP_URL"] ?? "").replace(/\/+$/u, "");
export const REDIRECT_URI = `${WEBAPP_URL}/auth/oauth-callback`;
export const MCP_RESOURCE = resolveMcpResourceIdentifier();
export const MCP_SCOPE = "openid profile email offline_access mcp:read mcp:write";
export const MCP_READ_SCOPE = "openid profile email offline_access mcp:read";

export const MCP_PROTOCOL_VERSION = "2026-07-28";

export function base64url(input: Buffer): string {
  return input.toString("base64url");
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { challenge, verifier };
}

export async function createTestUser(
  label: string,
): Promise<{ id: string; email: string; name: string }> {
  const name = `${label} User`;
  const id = generateId();
  const email = `${label.toLowerCase().replaceAll(" ", "-")}-${id}@example.test`;
  await prisma.user.create({ data: { email, emailVerified: true, id, name } });
  await provisionNewUser({ name, userId: id });
  return { email, id, name };
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

/** Public MCP test client (CIMD stand-in) linked to every MCP resource identifier. */
export async function upsertMcpPublicClient(
  clientId: string,
  clientDiscoveryId: string | null,
): Promise<void> {
  await prisma.oauthClient.upsert({
    create: {
      clientDiscoveryId,
      clientId,
      clientSecret: null,
      grantTypes: ["authorization_code", "refresh_token"],
      id: generateId(),
      name: `MCP test client ${clientId}`,
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
      clientDiscoveryId,
      disabled: false,
      redirectUris: [REDIRECT_URI],
      scopes: [...MCP_OAUTH_SCOPES],
      skipConsent: true,
    },
    where: { clientId },
  });
  for (const resourceId of resolveMcpResourceIdentifiers()) {
    await upsertClientResource(clientId, resourceId);
  }
}

export const CIMD_DISCOVERY_ID = CIMD_CLIENT_DISCOVERY_ID;

/** Run the authorize + token exchange round trip and return an MCP access token. */
export async function mintMcpToken(
  app: FastifyInstance,
  sessionToken: string,
  clientId: string,
  options: { resource?: string; scope?: string } = {},
): Promise<string> {
  const { scope = MCP_SCOPE, resource = MCP_RESOURCE } = options;
  const { challenge, verifier } = generatePkcePair();
  const authorize = await app.inject({
    headers: { authorization: `Bearer ${sessionToken}` },
    method: "GET",
    url: (() => {
      const url = new URL("http://test/auth/oauth2/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", REDIRECT_URI);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      url.searchParams.set("state", "mcp-tools");
      url.searchParams.set("scope", scope);
      url.searchParams.set("resource", resource);
      return `${url.pathname}?${url.searchParams.toString()}`;
    })(),
  });
  assert.equal(authorize.statusCode, 302, authorize.body);
  const token = await app.inject({
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    payload: new URLSearchParams({
      client_id: clientId,
      code: extractCode(authorize.headers.location as string),
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      resource,
    }).toString(),
    url: "/auth/oauth2/token",
  });
  assert.equal(token.statusCode, 200, token.body);
  return (token.json() as { access_token: string }).access_token;
}

export function mcpRequestMeta(): Record<string, unknown> {
  return {
    "io.modelcontextprotocol/clientCapabilities": {
      elicitation: { form: {} },
    },
    "io.modelcontextprotocol/clientInfo": { name: "bondery-mcp-test", version: "0" },
    "io.modelcontextprotocol/protocolVersion": MCP_PROTOCOL_VERSION,
  };
}

export function mcpHeaders(accessToken: string, extra?: Record<string, string>) {
  return {
    accept: "application/json, text/event-stream",
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
    "mcp-protocol-version": MCP_PROTOCOL_VERSION,
    ...extra,
  };
}

export async function callTool(
  app: FastifyInstance,
  accessToken: string,
  name: string,
  args: Record<string, unknown>,
  options?: {
    id?: number;
    inputResponses?: Record<string, unknown>;
    requestState?: string;
  },
) {
  return app.inject({
    headers: mcpHeaders(accessToken, { "mcp-method": "tools/call", "mcp-name": name }),
    method: "POST",
    payload: {
      id: options?.id ?? 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        _meta: mcpRequestMeta(),
        arguments: args,
        name,
        ...(options?.inputResponses ? { inputResponses: options.inputResponses } : {}),
        ...(options?.requestState !== undefined ? { requestState: options.requestState } : {}),
      },
    },
    url: "/mcp",
  });
}

export function mcpCallResult(response: { json: () => unknown }) {
  return (response.json() as { result?: Record<string, unknown> }).result;
}

export function mcpStructuredContent(response: {
  json: () => unknown;
}): Record<string, unknown> | undefined {
  const content = mcpCallResult(response)?.["structuredContent"];
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return undefined;
  }
  return content as Record<string, unknown>;
}

export function deleteConfirmResponses(
  action: "accept" | "cancel" | "decline",
  confirm = true,
): Record<string, unknown> {
  if (action === "accept") {
    return { confirm: { action: "accept", content: { confirm } } };
  }
  return { confirm: { action } };
}

export function tamperMcpRequestState(requestState: unknown): string {
  const value = String(requestState ?? "");
  const parts = value.split(".");
  const signature = parts[2] ?? "";
  if (signature.length === 0) {
    return `${value}x`;
  }
  const flipped = signature.startsWith("A") ? "B" : "A";
  return `${parts[0]}.${parts[1]}.${flipped}${signature.slice(1)}`;
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
