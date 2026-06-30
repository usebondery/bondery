import type { FastifySchema } from "fastify";
import type { RouteOptions } from "fastify";

export type OpenApiRouteArea = "integration" | "session" | "internal";

const INTEGRATION_SECURITY: NonNullable<FastifySchema["security"]> = [
  { bearerAuth: [] },
  { apiKeyAuth: [] },
];
const SESSION_SECURITY: NonNullable<FastifySchema["security"]> = [{ bearerAuth: [] }];

/**
 * Applies OpenAPI security and visibility metadata to a route during registration.
 */
export function applyOpenApiRouteMeta(
  routeOptions: RouteOptions,
  options: { area: OpenApiRouteArea },
): void {
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
