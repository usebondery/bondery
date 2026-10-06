/**
 * Mounts the Better Auth handler on Fastify at /auth/* plus RFC 8414 / RFC 9728
 * well-known documents outside that prefix.
 *
 * The Fetch bridge lives in fetch-bridge.ts (shared with POST /mcp).
 */
import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from "@better-auth/oauth-provider";
import {
  API_ROUTES,
  BETTER_AUTH_BASE_PATH,
  BETTER_AUTH_PROTECTED_RESOURCE_METADATA_PATH,
  betterAuthAuthorizationServerMetadataPaths,
  betterAuthOpenIdConfigurationPaths,
  betterAuthProtectedResourceMetadataPaths,
} from "@bondery/helpers/globals/paths";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { badRequest } from "../platform/errors/http-errors.js";
import { CANONICAL_ORIGIN, sendFetchResponse, toFetchRequest } from "./fetch-bridge.js";
import { auth } from "./index.js";
import { oauthProviders } from "./oauth-provider-config.js";
import { resolveUnconfiguredSocialOAuthProvider } from "./oauth-social-request.js";
import { isMagicLinkVerifyPath } from "./redact-auth-query.js";

const authServerMetadataHandler = oauthProviderAuthServerMetadata(auth);
const openIdConfigMetadataHandler = oauthProviderOpenIdConfigMetadata(auth);

const MCP_CONCATENATED_PRM_PATH = `${API_ROUTES.MCP}${BETTER_AUTH_PROTECTED_RESOURCE_METADATA_PATH}`;
const MCP_CANONICAL_PRM_PATH = `${BETTER_AUTH_PROTECTED_RESOURCE_METADATA_PATH}${API_ROUTES.MCP}`;

/**
 * Better Auth `mcp()` serves RFC 9728 at inserted well-known paths, not
 * `{resource}/.well-known/...`. Rewrite the concatenated alias so aliases
 * return the same JSON as the canonical MCP document.
 */
function toProtectedResourceMetadataRequest(request: FastifyRequest): Request {
  const fetchRequest = toFetchRequest(request);
  const pathname = new URL(fetchRequest.url).pathname.replace(/\/+$/, "") || "/";
  if (pathname !== MCP_CONCATENATED_PRM_PATH) {
    return fetchRequest;
  }

  return new Request(new URL(MCP_CANONICAL_PRM_PATH, CANONICAL_ORIGIN), fetchRequest);
}

async function sendAuthFetchResponse(
  request: Parameters<typeof sendFetchResponse>[0],
  reply: Parameters<typeof sendFetchResponse>[1],
  response: Response,
): Promise<void> {
  if (!isMagicLinkVerifyPath(request.url)) {
    await sendFetchResponse(request, reply, response);
    return;
  }

  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "no-referrer");
  await sendFetchResponse(
    request,
    reply,
    new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    }),
  );
}

export async function registerAuthRoutes(fastify: FastifyInstance): Promise<void> {
  // RFC 8414 / OIDC discovery must be reachable outside /auth/* (see Better Auth docs).
  // Origin-root aliases serve the same JSON (HTTP 200, no redirect).
  for (const path of betterAuthAuthorizationServerMetadataPaths()) {
    fastify.get(path, async (request, reply) => {
      const response = await authServerMetadataHandler(toFetchRequest(request));
      await sendAuthFetchResponse(request, reply, response);
    });
  }

  for (const path of betterAuthOpenIdConfigurationPaths()) {
    fastify.get(path, async (request, reply) => {
      const response = await openIdConfigMetadataHandler(toFetchRequest(request));
      await sendAuthFetchResponse(request, reply, response);
    });
  }

  // mcp() serves RFC 9728 onRequest of auth.handler. Better Auth is only
  // mounted at /auth/*, so Fastify must forward these well-known paths.
  // Documents advertise the MCP resource identifier (plugin design).
  for (const path of betterAuthProtectedResourceMetadataPaths()) {
    fastify.get(path, async (request, reply) => {
      const response = await auth.handler(toProtectedResourceMetadataRequest(request));
      await sendAuthFetchResponse(request, reply, response);
    });
  }

  // Convenience pointer for API-origin probes. Not MCP spec and not RFC 8414 —
  // OAuth JSON stays on the discovery documents above. Unauthenticated GET /mcp
  // after this hop is 401 + RFC 9728 WWW-Authenticate.
  const mcpUrl = `${CANONICAL_ORIGIN}${API_ROUTES.MCP}`;
  fastify.get(API_ROUTES.WELL_KNOWN_MCP, async (_request, reply) => {
    return reply.redirect(mcpUrl, 308);
  });

  fastify.route({
    async handler(request, reply) {
      if (
        resolveUnconfiguredSocialOAuthProvider(
          request.method,
          request.url,
          request.body,
          oauthProviders,
        )
      ) {
        throw badRequest(
          "OAuth provider is not configured on this instance",
          "oauth_provider_not_configured",
        );
      }

      const response = await auth.handler(toFetchRequest(request));
      await sendAuthFetchResponse(request, reply, response);
    },
    method: ["GET", "POST"],
    url: `${BETTER_AUTH_BASE_PATH}/*`,
  });
}
