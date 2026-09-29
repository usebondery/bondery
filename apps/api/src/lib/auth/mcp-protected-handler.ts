/**
 * MCP resource-server gate with loopback audience aliases.
 *
 * Better Auth `createMcpProtectedRequestHandler` takes a single `audience`
 * string. Local REST already accepts both `localhost` and `127.0.0.1`; MCP
 * `{API}/mcp` must do the same. Verification uses in-process JWKS (see
 * `verify-access-jwt.ts`) so inject tests and hairpin-unfriendly hosts work.
 */
import { createResourceServerChallenge } from "@better-auth/oauth-provider";
import { isInsufficientScopeError } from "better-auth/oauth2";
import { APIError } from "better-call";
import type { JWTPayload } from "jose";
import {
  MCP_READ_SCOPE,
  MCP_WRITE_SCOPE,
  resolveMcpResourceAudience,
  resolveMcpResourceIdentifier,
} from "./index.js";
import { verifyBonderyAccessJwt } from "./verify-access-jwt.js";

export const MCP_CHALLENGE_SCOPES = [MCP_READ_SCOPE, MCP_WRITE_SCOPE] as const;

function jsonRpcChallenge(error: unknown, resource: string | string[]): Response {
  const challenge = createResourceServerChallenge(error, resource, {
    challengeScopes: MCP_CHALLENGE_SCOPES,
  });
  if (!challenge) {
    throw error;
  }
  const headers = new Headers(challenge.headers);
  headers.set("Content-Type", "application/json");
  return new Response(
    JSON.stringify({
      error: {
        code: -32000,
        message: challenge.message,
      },
      id: null,
      jsonrpc: "2.0",
    }),
    {
      headers,
      status: challenge.statusCode,
    },
  );
}

/**
 * Verify an MCP access token (audience aliases + mcp:read door). Nested
 * `createInsufficientScopeError` throws from write tools are mapped to
 * RFC 6750 `insufficient_scope`. Trusted first-party client_id is not
 * consulted on this path.
 */
export function createBonderyMcpAuthHandler(
  handler: (request: Request, accessTokenClaims: JWTPayload) => Promise<Response>,
): (request: Request) => Promise<Response> {
  const audience = resolveMcpResourceAudience();
  const resource = resolveMcpResourceIdentifier();

  return async (request) => {
    const authorization = request.headers.get("authorization");
    const token =
      typeof authorization === "string" && authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";

    let accessTokenClaims: JWTPayload;
    try {
      if (!token) {
        throw new APIError("UNAUTHORIZED", { message: "missing authorization header" });
      }
      accessTokenClaims = await verifyBonderyAccessJwt(token, {
        audience,
        requiredScopes: [MCP_READ_SCOPE],
      });
    } catch (error) {
      return jsonRpcChallenge(error, resource);
    }

    try {
      return await handler(request, accessTokenClaims);
    } catch (error) {
      if (isInsufficientScopeError(error)) {
        return jsonRpcChallenge(error, resource);
      }
      throw error;
    }
  };
}
