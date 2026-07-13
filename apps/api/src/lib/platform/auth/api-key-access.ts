/**
 * Route allowlist and permission checks for API key authenticated requests.
 */

import type { ApiKeyPermission } from "@bondery/schemas";
import type { FastifyReply, FastifyRequest } from "fastify";
import { forbidden } from "../errors/http-errors.js";
import type { AppFastifyInstance } from "../fastify-types.js";
import type { OpenApiRouteArea } from "../openapi/meta.js";

const READ_METHODS = new Set(["GET", "HEAD"]);

function normalizePath(url: string): string {
  const path = url.split("?")[0] ?? url;
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
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

function isApiKeyAllowedOnRoute(request: FastifyRequest, path: string): boolean {
  const area = request.routeOptions?.config?.openApiArea as OpenApiRouteArea | undefined;

  if (area === "integration") {
    return true;
  }

  if (area === "session" || area === "internal") {
    return false;
  }

  request.log.warn(
    {
      event: "api_key.missing_open_api_area",
      method: request.method,
      path,
    },
    "API key request hit route without openApiArea; denying",
  );
  return false;
}

export function assertApiKeyAccess(request: FastifyRequest, _reply: FastifyReply): void {
  if (!request.authApiKey) {
    return;
  }

  const path = normalizePath(request.url);
  const method = request.method.toUpperCase();
  const permissionMessage = `This API key does not have permission for ${method} ${path}`;

  if (!isApiKeyAllowedOnRoute(request, path)) {
    throw forbidden(permissionMessage, "api_key_route_forbidden");
  }

  if (!isMethodAllowedForPermission(method, request.authApiKey.permission)) {
    throw forbidden(permissionMessage, "api_key_method_forbidden");
  }
}

/** Register session or API key auth with route/permission guards on a route module. */
export function registerApiKeyProtectedHooks(fastify: AppFastifyInstance): void {
  fastify.addHook("onRequest", fastify.auth([fastify.verifyAuth]));
  fastify.addHook("preHandler", fastify.assertApiKeyAccess);
}

/** Session-only auth (no API keys). */
export function registerSessionAuthHooks(fastify: AppFastifyInstance): void {
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));
}

/** Admin session auth (bearer only, requires is_admin). */
export function registerAdminAuthHooks(fastify: AppFastifyInstance): void {
  fastify.addHook("onRequest", fastify.auth([fastify.verifyAdmin]));
}

/** Service-role bearer auth for server-to-server internal routes. */
export function registerInternalAuthHooks(fastify: AppFastifyInstance): void {
  fastify.addHook("onRequest", fastify.auth([fastify.verifyServiceSecret]));
}
