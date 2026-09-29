/**
 * Better Auth session and OAuth JWT resolution for Fastify request auth.
 */

import { prisma } from "@bondery/db";
import type { FastifyRequest } from "fastify";
import type { JWTPayload } from "jose";
import {
  auth,
  resolveApiResourceAudience,
  resolveTrustedOAuthClientIds,
} from "../../auth/index.js";
import { toFetchHeaders } from "../../auth/request-headers.js";
import { verifyBonderyAccessJwt } from "../../auth/verify-access-jwt.js";

export type ResolvedAuthUser = {
  email: string;
  id: string;
};

function isJwtShapedBearerToken(token: string): boolean {
  return token.split(".").length === 3;
}

function extractBearerToken(request: FastifyRequest): string | undefined {
  const authHeader = request.headers.authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return undefined;
  }

  return authHeader.slice(7).trim() || undefined;
}

async function loadAuthUser(userId: string): Promise<ResolvedAuthUser | null> {
  const user = await prisma.user.findUnique({
    select: { email: true, id: true },
    where: { id: userId },
  });

  if (!user?.email) {
    return null;
  }

  return { email: user.email, id: user.id };
}

function isTrustedOAuthClient(payload: JWTPayload): boolean {
  const trustedClientIds = resolveTrustedOAuthClientIds();
  if (!trustedClientIds) {
    return true;
  }

  const clientId =
    (typeof payload.client_id === "string" && payload.client_id) ||
    (typeof payload.azp === "string" && payload.azp) ||
    null;

  return Boolean(clientId && trustedClientIds.has(clientId));
}

/**
 * Verifies a resource-bound OAuth access JWT issued by this API's AS.
 * JWT-shaped tokens never fall back to opaque session lookup.
 */
export async function resolveOAuthBearerUser(token: string): Promise<ResolvedAuthUser | null> {
  if (!isJwtShapedBearerToken(token)) {
    return null;
  }

  let payload: JWTPayload;
  try {
    payload = await verifyBonderyAccessJwt(token, {
      audience: resolveApiResourceAudience(),
      requiredScopes: ["api:access"],
    });
  } catch {
    return null;
  }

  if (!isTrustedOAuthClient(payload)) {
    return null;
  }

  const userId = typeof payload.sub === "string" ? payload.sub : null;
  if (!userId) {
    return null;
  }

  return loadAuthUser(userId);
}

/**
 * Resolves the caller from Better Auth cookies or an opaque bearer session token.
 */
export async function resolveBetterAuthSessionUser(
  request: FastifyRequest,
): Promise<ResolvedAuthUser | null> {
  const session = await auth.api.getSession({ headers: toFetchHeaders(request) });
  if (!session?.user?.id) {
    return null;
  }

  return {
    email: session.user.email,
    id: session.user.id,
  };
}

export async function resolveRequestAuthUser(
  request: FastifyRequest,
): Promise<ResolvedAuthUser | null> {
  const bearerToken = extractBearerToken(request);

  if (bearerToken && isJwtShapedBearerToken(bearerToken)) {
    return resolveOAuthBearerUser(bearerToken);
  }

  return resolveBetterAuthSessionUser(request);
}
