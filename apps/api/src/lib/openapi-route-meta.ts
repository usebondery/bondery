import type { RouteOptions } from "fastify";

export type OpenApiRouteArea = "integration" | "session" | "internal";

const INTEGRATION_SECURITY = [{ bearerAuth: [] as string[] }, { apiKeyAuth: [] as string[] }];
const SESSION_SECURITY = [{ bearerAuth: [] as string[] }];

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

  routeOptions.schema.security =
    options.area === "integration" ? INTEGRATION_SECURITY : SESSION_SECURITY;
}
