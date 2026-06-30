/**
 * Route allowlist and permission checks for API key authenticated requests.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AppFastifyInstance } from "./fastify-types.js";
import type { ApiKeyPermission } from "@bondery/schemas";

/** Routes API keys may access (tier-1 + share + imports + geocode). */
export const API_KEY_ALLOWED_ROUTE_PREFIXES = [
  "/api/contacts/import/linkedin",
  "/api/contacts/import/instagram",
  "/api/contacts/import/vcard",
  "/api/contacts/share",
  "/api/contacts",
  "/api/groups",
  "/api/tags",
  "/api/interactions",
  "/api/geocode",
] as const;

const API_KEY_EXPLICIT_DENY_PREFIXES = [
  "/api/me/api-keys",
  "/api/sync/",
  "/api/chat/",
  "/api/admin/",
  "/api/internal/",
  "/api/subscriptions/",
  "/api/extension/",
  "/api/webhooks/",
] as const;

const READ_METHODS = new Set(["GET", "HEAD"]);

function normalizePath(url: string): string {
  const path = url.split("?")[0] ?? url;
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

export function isPathAllowedForApiKey(path: string): boolean {
  const normalized = normalizePath(path);

  for (const deny of API_KEY_EXPLICIT_DENY_PREFIXES) {
    if (normalized.startsWith(deny) || normalized === deny.replace(/\/$/, "")) {
      return false;
    }
  }

  return API_KEY_ALLOWED_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function isMethodAllowedForPermission(
  method: string,
  permission: ApiKeyPermission,
): boolean {
  const upper = method.toUpperCase();
  if (permission === "full") {
    return true;
  }
  return READ_METHODS.has(upper);
}

export function assertApiKeyAccess(
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (!request.authApiKey) {
    return;
  }

  const path = normalizePath(request.url);
  const method = request.method.toUpperCase();

  if (!isPathAllowedForApiKey(path)) {
    const err = new Error(
      `This API key does not have permission for ${method} ${path}`,
    ) as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }

  if (!isMethodAllowedForPermission(method, request.authApiKey.permission)) {
    const err = new Error(
      `This API key does not have permission for ${method} ${path}`,
    ) as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }
}

/** Register session or API key auth with route/permission guards on a route module. */
export function registerApiKeyProtectedHooks(fastify: AppFastifyInstance): void {
  fastify.addHook("onRequest", fastify.auth([fastify.verifyAuth]));
  fastify.addHook("preHandler", fastify.assertApiKeyAccess);
}
