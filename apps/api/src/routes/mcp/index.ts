/**
 * MCP HTTP endpoint — OAuth JWT audience `{API}/mcp`, not REST session/API keys.
 *
 * Auth/protocol errors are JSON-RPC + RFC 9728 WWW-Authenticate.
 * Tool failures inside the JSON-RPC result use the REST error envelope (`isError: true`).
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@bondery/db";
import { readBuildMetadata } from "@bondery/helpers/infra/build-metadata";
import { type AuthInfo, createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { createInsufficientScopeError } from "better-auth/oauth2";
import type { JWTPayload } from "jose";
import { sendFetchResponse, toFetchRequest } from "../../lib/auth/fetch-bridge.js";
import { MCP_WRITE_SCOPE } from "../../lib/auth/index.js";
import { createBonderyMcpAuthHandler } from "../../lib/auth/mcp-protected-handler.js";
import { domainContextFromUser } from "../../lib/platform/domain-context.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { MCP_TIER } from "../../lib/platform/rate-limit.js";
import { MCP_SERVER_INSTRUCTIONS } from "./instructions.js";
import { registerContactMcpTools } from "./tools/contacts.js";
import { registerGroupMcpTools } from "./tools/groups.js";
import { registerImportantDateMcpTools } from "./tools/important-dates.js";
import { registerInteractionMcpTools } from "./tools/interactions.js";
import { registerKeepInTouchMcpTools } from "./tools/keep-in-touch.js";
import { isMcpWriteToolName } from "./tools/mcp-write-name.js";
import { registerMcpPrompts } from "./tools/prompts.js";
import { registerRelationshipMcpTools } from "./tools/relationships.js";
import { registerShareMcpTools } from "./tools/share.js";
import { registerTagMcpTools } from "./tools/tags.js";

const MCP_SERVER_VERSION = readBuildMetadata().version ?? "1.9.2";

const mcpHttpHandler = createMcpHandler(
  async (mcpCtx) => {
    const extra = mcpCtx.authInfo?.extra as
      | { claims?: JWTPayload; email?: string; requestId?: string; userId?: string }
      | undefined;
    const userId = extra?.userId ?? "";
    const email = extra?.email ?? "";
    const claims = extra?.claims;
    if (!userId || !email || !claims) {
      throw new Error("MCP handler missing verified principal");
    }

    const ctx = domainContextFromUser(
      { email, id: userId },
      undefined,
      extra?.requestId ?? randomUUID(),
    );
    const server = new McpServer(
      { name: "Bondery", version: MCP_SERVER_VERSION },
      { instructions: MCP_SERVER_INSTRUCTIONS },
    );
    registerContactMcpTools(server, ctx, claims);
    registerGroupMcpTools(server, ctx, claims);
    registerImportantDateMcpTools(server, ctx, claims);
    registerInteractionMcpTools(server, ctx, claims);
    registerKeepInTouchMcpTools(server, ctx, claims);
    registerRelationshipMcpTools(server, ctx, claims);
    registerShareMcpTools(server, ctx, claims);
    registerTagMcpTools(server, ctx, claims);
    registerMcpPrompts(server);
    return server;
  },
  // MCP 2026-07-28 only (`@modelcontextprotocol/server` v2). Do not serve
  // 2025-era initialize (`legacy: "stateless"`).
  { legacy: "reject" },
);

function authInfoFromClaims(request: Request, claims: JWTPayload, email: string): AuthInfo {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const scopes = typeof claims.scope === "string" ? claims.scope.split(" ").filter(Boolean) : [];
  const clientId =
    (typeof claims.client_id === "string" && claims.client_id) ||
    (typeof claims.azp === "string" && claims.azp) ||
    "";
  return {
    clientId,
    expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
    extra: {
      claims,
      email,
      requestId: request.headers.get("x-request-id") ?? undefined,
      userId: claims.sub,
    },
    scopes,
    token,
  };
}

async function resolveMcpToolName(request: Request): Promise<string | null> {
  const header = request.headers.get("mcp-name");
  if (header) {
    return header;
  }

  try {
    const body: unknown = await request.clone().json();
    if (
      body &&
      typeof body === "object" &&
      "method" in body &&
      body.method === "tools/call" &&
      "params" in body &&
      body.params &&
      typeof body.params === "object" &&
      "name" in body.params &&
      typeof body.params.name === "string"
    ) {
      return body.params.name;
    }
  } catch {
    return null;
  }

  return null;
}

function grantedScopes(claims: JWTPayload): string[] {
  return typeof claims.scope === "string" ? claims.scope.split(" ").filter(Boolean) : [];
}

const mcpAuthHandler = createBonderyMcpAuthHandler(async (request, claims) => {
  const mcpName = await resolveMcpToolName(request);
  if (mcpName && isMcpWriteToolName(mcpName) && !grantedScopes(claims).includes(MCP_WRITE_SCOPE)) {
    throw createInsufficientScopeError([MCP_WRITE_SCOPE]);
  }

  const userId = typeof claims.sub === "string" ? claims.sub : "";
  if (!userId) {
    return new Response(
      JSON.stringify({
        error: { code: -32000, message: "invalid_token" },
        id: null,
        jsonrpc: "2.0",
      }),
      { headers: { "Content-Type": "application/json" }, status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    select: { email: true, id: true },
    where: { id: userId },
  });
  if (!user?.email) {
    return new Response(
      JSON.stringify({
        error: { code: -32000, message: "invalid_token" },
        id: null,
        jsonrpc: "2.0",
      }),
      { headers: { "Content-Type": "application/json" }, status: 401 },
    );
  }

  return mcpHttpHandler.fetch(request, {
    authInfo: authInfoFromClaims(request, claims, user.email),
  });
});

const MCP_POST_ONLY_HEADERS = { Allow: "POST" } as const;

/** Authenticated GET/HEAD stay POST-only. Missing/invalid Bearer uses the same 401 as POST. */
const mcpProbeHandler = createBonderyMcpAuthHandler(async () => {
  return new Response(null, { headers: MCP_POST_ONLY_HEADERS, status: 405 });
});

function fetchResponseForMcpProbe(method: string, response: Response): Response {
  if (method !== "HEAD") {
    return response;
  }

  return new Response(null, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export const mcpRoutes: AppRoutePlugin = async (fastify) => {
  fastify.post(
    "/",
    {
      config: { rateLimit: MCP_TIER },
      schema: { hide: true },
    },
    async (request, reply) => {
      const response = await mcpAuthHandler(toFetchRequest(request));
      await sendFetchResponse(request, reply, response);
    },
  );

  fastify.route({
    async handler(request, reply) {
      const response = fetchResponseForMcpProbe(
        request.method,
        await mcpProbeHandler(toFetchRequest(request)),
      );
      await sendFetchResponse(request, reply, response);
    },
    method: ["GET", "HEAD"],
    schema: { hide: true },
    url: "/",
  });

  fastify.delete("/", { schema: { hide: true } }, async (_request, reply) => {
    return reply.header("Allow", "POST").code(405).send();
  });
};
