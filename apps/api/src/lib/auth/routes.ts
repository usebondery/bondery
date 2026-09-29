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
  BETTER_AUTH_BASE_PATH,
  betterAuthAuthorizationServerMetadataPath,
  betterAuthPath,
  betterAuthProtectedResourceMetadataPaths,
} from "@bondery/helpers/globals/paths";
import type { FastifyInstance } from "fastify";
import { badRequest } from "../platform/errors/http-errors.js";
import { sendFetchResponse, toFetchRequest } from "./fetch-bridge.js";
import { auth } from "./index.js";
import { oauthProviders } from "./oauth-provider-config.js";
import { resolveUnconfiguredSocialOAuthProvider } from "./oauth-social-request.js";
import { isMagicLinkVerifyPath } from "./redact-auth-query.js";
import { rewriteDcrRegistrationBody } from "./rewrite-dcr-registration-body.js";

const authServerMetadataHandler = oauthProviderAuthServerMetadata(auth);
const openIdConfigMetadataHandler = oauthProviderOpenIdConfigMetadata(auth);

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
  fastify.get(betterAuthAuthorizationServerMetadataPath(), async (request, reply) => {
    const response = await authServerMetadataHandler(toFetchRequest(request));
    await sendAuthFetchResponse(request, reply, response);
  });

  fastify.get(betterAuthPath("/.well-known/openid-configuration"), async (request, reply) => {
    const response = await openIdConfigMetadataHandler(toFetchRequest(request));
    await sendAuthFetchResponse(request, reply, response);
  });

  // mcp() serves RFC 9728 onRequest of auth.handler. Better Auth is only
  // mounted at /auth/*, so Fastify must forward these well-known paths.
  // Both documents advertise the MCP resource identifier (plugin design).
  for (const path of betterAuthProtectedResourceMetadataPaths()) {
    fastify.get(path, async (request, reply) => {
      const response = await auth.handler(toFetchRequest(request));
      await sendAuthFetchResponse(request, reply, response);
    });
  }

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

      if (request.method === "POST") {
        const path = request.url.split("?")[0] ?? request.url;
        if (path === betterAuthPath("/oauth2/register")) {
          request.body = rewriteDcrRegistrationBody(request.body);
        }
      }

      const response = await auth.handler(toFetchRequest(request));
      await sendAuthFetchResponse(request, reply, response);
    },
    method: ["GET", "POST"],
    url: `${BETTER_AUTH_BASE_PATH}/*`,
  });
}
