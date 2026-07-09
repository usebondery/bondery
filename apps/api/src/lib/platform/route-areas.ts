/**
 * Area-based route shells — attach openApiArea metadata and auth hooks at mount time.
 * Only this module (via register-all.ts) should wire auth for route trees.
 */

import type { RouteOptions } from "fastify";
import {
  registerAdminAuthHooks,
  registerApiKeyProtectedHooks,
  registerInternalAuthHooks,
  registerSessionAuthHooks,
} from "./auth/api-key-access.js";
import type { AppRoutePlugin } from "./fastify-types.js";
import { applyOpenApiRouteMeta, type OpenApiRouteArea } from "./openapi/meta.js";

function stampOpenApiArea(area: OpenApiRouteArea) {
  return (routeOptions: RouteOptions) => {
    applyOpenApiRouteMeta(routeOptions, { area });
    recordAuditedRoute(routeOptions, area);
  };
}

type AuditedRoute = {
  method: string;
  url: string;
  openApiArea: OpenApiRouteArea;
};

let routeSecurityAudit: AuditedRoute[] | null = null;

/** Enable route metadata collection (used by route-security-audit.test.ts). */
export function enableRouteSecurityAudit(): void {
  routeSecurityAudit = [];
}

export function getRouteSecurityAudit(): AuditedRoute[] {
  return routeSecurityAudit ?? [];
}

export function disableRouteSecurityAudit(): void {
  routeSecurityAudit = null;
}

function recordAuditedRoute(routeOptions: RouteOptions, area: OpenApiRouteArea): void {
  if (!routeSecurityAudit) {
    return;
  }

  const methods = Array.isArray(routeOptions.method) ? routeOptions.method : [routeOptions.method];
  const url = routeOptions.url ?? "";

  for (const method of methods) {
    routeSecurityAudit.push({
      method: String(method).toUpperCase(),
      openApiArea: area,
      url,
    });
  }
}

/** Integration routes: session or API key auth with route/method policy. */
export function integrationRoutes(plugin: AppRoutePlugin): AppRoutePlugin {
  return async (fastify) => {
    fastify.addHook("onRoute", stampOpenApiArea("integration"));
    registerApiKeyProtectedHooks(fastify);
    await fastify.register(plugin);
  };
}

/** Session routes: Supabase session only (no API keys). */
export function sessionRoutes(plugin: AppRoutePlugin): AppRoutePlugin {
  return async (fastify) => {
    fastify.addHook("onRoute", stampOpenApiArea("session"));
    registerSessionAuthHooks(fastify);
    await fastify.register(plugin);
  };
}

/** Admin routes: session + is_admin (OpenAPI area remains session/bearer-only). */
export function adminRoutes(plugin: AppRoutePlugin): AppRoutePlugin {
  return async (fastify) => {
    fastify.addHook("onRoute", stampOpenApiArea("session"));
    registerAdminAuthHooks(fastify);
    await fastify.register(plugin);
  };
}

/** Internal routes: service-role bearer auth. */
export function internalRoutes(plugin: AppRoutePlugin): AppRoutePlugin {
  return async (fastify) => {
    fastify.addHook("onRoute", stampOpenApiArea("internal"));
    registerInternalAuthHooks(fastify);
    await fastify.register(plugin);
  };
}

/** OpenAPI metadata only — for routes with custom auth (WS ticket, webhook HMAC). */
export function openApiAreaRoutes(area: OpenApiRouteArea, plugin: AppRoutePlugin): AppRoutePlugin {
  return async (fastify) => {
    fastify.addHook("onRoute", stampOpenApiArea(area));
    await fastify.register(plugin);
  };
}
