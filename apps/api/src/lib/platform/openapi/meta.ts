import type { FastifySchema, RouteOptions } from "fastify";

type OpenApiRouteArea = "integration" | "session" | "internal" | "dav";

declare module "fastify" {
  interface FastifyContextConfig {
    /**
     * `false` skips @fastify/cors for the route: no CORS headers and no strict preflight check.
     * The plugin reads this key. DAV routes use it, because DAV clients are not browsers.
     */
    cors?: false;
    /**
     * When false, a present Idempotency-Key is rejected.
     * SSE routes cannot store a body to replay.
     */
    idempotency?: boolean;
    /** Drives OpenAPI security and API key route policy. */
    openApiArea?: OpenApiRouteArea;
  }
}

const INTEGRATION_SECURITY: NonNullable<FastifySchema["security"]> = [
  { bearerAuth: [] },
  { apiKeyAuth: [] },
];
const SESSION_SECURITY: NonNullable<FastifySchema["security"]> = [{ bearerAuth: [] }];

export type { OpenApiRouteArea };

/**
 * Applies OpenAPI security, visibility metadata, and route config for API key policy.
 */
export function applyOpenApiRouteMeta(
  routeOptions: RouteOptions,
  options: { area: OpenApiRouteArea },
): void {
  routeOptions.config = {
    ...routeOptions.config,
    openApiArea: options.area,
  };

  // DAV routes speak WebDAV, not JSON. They stay out of the published OpenAPI document.
  if (options.area === "dav") {
    routeOptions.schema = { ...routeOptions.schema, hide: true };
    return;
  }

  if (!routeOptions.schema) {
    return;
  }

  if (options.area === "internal") {
    const tags = routeOptions.schema.tags ?? [];
    if (!tags.includes("Internal")) {
      routeOptions.schema.tags = [...tags, "Internal"];
    }
    return;
  }

  (routeOptions.schema as FastifySchema).security =
    options.area === "integration" ? INTEGRATION_SECURITY : SESSION_SECURITY;
}
