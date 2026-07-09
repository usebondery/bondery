import type { FastifySchema, RouteOptions } from "fastify";

export type OpenApiRouteArea = "integration" | "session" | "internal";

declare module "fastify" {
  interface FastifyContextConfig {
    /** Drives OpenAPI security and API key route policy. */
    openApiArea?: OpenApiRouteArea;
  }
}

const INTEGRATION_SECURITY: NonNullable<FastifySchema["security"]> = [
  { bearerAuth: [] },
  { apiKeyAuth: [] },
];
const SESSION_SECURITY: NonNullable<FastifySchema["security"]> = [{ bearerAuth: [] }];

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
