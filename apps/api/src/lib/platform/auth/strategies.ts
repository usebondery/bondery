/**
 * Authentication strategies for @fastify/auth
 *
 * Provides composable auth strategies that run as onRequest hooks,
 * rejecting unauthorized requests before the body is parsed.
 *
 * Usage in route modules:
 *   fastify.addHook('onRequest', fastify.auth([fastify.verifySession]));
 *
 * Then in handlers:
 *   const { user } = getAuth(request);
 */

import { prisma } from "@bondery/db";
import { betterAuthPath } from "@bondery/helpers/globals/paths";
import type { ApiKeyPermission } from "@bondery/schemas";
import type { FastifyReply, FastifyRequest } from "fastify";
import { productPermissionFromBa } from "../../auth/api-key-permissions.js";
import { BEARER_PREFIX, isJwtShapedToken } from "../../auth/bearer-token-format.js";
import { auth } from "../../auth/index.js";
import { unauthorized } from "../errors/http-errors.js";
import type { AppFastifyInstance } from "../fastify-types.js";
import { assertApiKeyAccess } from "./api-key-access.js";
import { isApiKeyBearerToken } from "./api-keys.js";
import { resolveOAuthBearerUser, resolveRequestAuthUser } from "./resolve-request-auth.js";
import { createVerifyServiceSecret } from "./service-secret.js";

// ── Type augmentation ────────────────────────────────────────────────────────

declare module "fastify" {
  // biome-ignore lint/suspicious/noShadow: module augmentation must reuse fastify's own interface name to merge with it
  interface FastifyRequest {
    /** Set when the request was authenticated via a long-lived API key */
    authApiKey: {
      id: string;
      permission: ApiKeyPermission;
      label: string;
    } | null;
    /** Authenticated user — set by verifySession / verifyAuth strategies */
    authUser: { id: string; email: string } | null;
  }

  interface FastifyInstance {
    /** Enforces API key route allowlist and permission for key-authenticated requests */
    assertApiKeyAccess: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Validates session or long-lived API key */
    verifyAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Validates service role key via Authorization: Bearer header for server-to-server calls */
    verifyServiceSecret: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Validates Better Auth session or OAuth resource JWT */
    verifySession: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function extractBearerToken(request: FastifyRequest): string | undefined {
  const authHeader = request.headers.authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith(BEARER_PREFIX)) {
    return undefined;
  }

  return authHeader.slice(BEARER_PREFIX.length).trim() || undefined;
}

async function applyResolvedAuth(
  request: FastifyRequest,
  user: { id: string; email: string },
  apiKey: FastifyRequest["authApiKey"] = null,
): Promise<void> {
  request.authUser = user;
  request.authApiKey = apiKey;
}

// ── Strategy registration ────────────────────────────────────────────────────

/**
 * Registers auth strategy decorators on the Fastify instance.
 * Must be called after @fastify/env (needs config) and before route registration.
 */
export function registerAuthStrategies(fastify: AppFastifyInstance): void {
  fastify.decorateRequest("authUser", null);
  fastify.decorateRequest("authApiKey", null);

  fastify.decorate(
    "verifySession",
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const bearerToken = extractBearerToken(request);
      const user =
        bearerToken && isJwtShapedToken(bearerToken)
          ? await resolveOAuthBearerUser(bearerToken)
          : await resolveRequestAuthUser(request);

      if (!user) {
        throw unauthorized("Unauthorized - Please log in", "auth_required");
      }

      await applyResolvedAuth(request, user);
    },
  );

  fastify.decorate(
    "verifyAuth",
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const bearerToken = extractBearerToken(request);

      if (bearerToken && isApiKeyBearerToken(bearerToken)) {
        const verification = await auth.api.verifyApiKey({
          body: { key: bearerToken },
        });

        if (!verification.valid || !verification.key) {
          throw unauthorized("Invalid API key", "invalid_api_key");
        }

        const userId = verification.key.referenceId;
        const permission = productPermissionFromBa(verification.key.permissions);

        const keyUser = await prisma.user.findUnique({
          select: { email: true, id: true },
          where: { id: userId },
        });

        if (!keyUser?.email) {
          throw unauthorized("Invalid API key", "invalid_api_key");
        }

        await applyResolvedAuth(
          request,
          { email: keyUser.email, id: keyUser.id },
          {
            id: verification.key.id,
            label: verification.key.name ?? "",
            permission,
          },
        );
        return;
      }

      const resolvedUser = await resolveRequestAuthUser(request);
      if (!resolvedUser) {
        throw unauthorized("Unauthorized - Please log in", "auth_required");
      }

      await applyResolvedAuth(request, resolvedUser);
    },
  );

  fastify.decorate(
    "assertApiKeyAccess",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      assertApiKeyAccess(request, reply);
    },
  );

  fastify.decorate(
    "verifyServiceSecret",
    createVerifyServiceSecret(() => fastify.config.BONDERY_PRIVATE_SERVICE_SECRET),
  );
}

/**
 * Verifies the in-process Better Auth JWKS endpoint before listen.
 *
 * Uses Fastify inject (no loopback HTTP) so boot does not depend on Traefik/DNS
 * hairpin to BONDERY_PUBLIC_API_URL. The public issuer URL is still logged.
 */
export async function verifyAuthRuntime(fastify: AppFastifyInstance): Promise<void> {
  const publicBaseUrl = fastify.config.BONDERY_PUBLIC_API_URL.replace(/\/+$/, "");
  const publicJwksUrl = `${publicBaseUrl}${betterAuthPath("/jwks")}`;
  const jwksPath = betterAuthPath("/jwks");

  await fastify.ready();

  const response = await fastify.inject({ method: "GET", url: jwksPath });
  if (response.statusCode !== 200) {
    fastify.log.error(
      { publicJwksUrl, statusCode: response.statusCode },
      "Better Auth JWKS is not reachable",
    );
    throw new Error(
      `Better Auth JWKS is not reachable at ${jwksPath} (HTTP ${response.statusCode})`,
    );
  }

  fastify.log.info({ jwksPath, publicJwksUrl }, "Better Auth JWKS reachable");
}

// ── Helper for handlers ──────────────────────────────────────────────────────

/**
 * Retrieve the authenticated user from the request.
 * Only call this inside handlers protected by verifySession.
 */
export function getAuth(request: FastifyRequest): {
  user: { id: string; email: string };
} {
  const user = request.authUser;
  if (!user) {
    throw new Error("getAuth called without verifySession");
  }

  return { user };
}
