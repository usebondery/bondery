/**
 * Extension API Routes
 * Handles browser extension integration for creating/updating contacts
 */

import type { AppRoutePlugin } from "../../lib/fastify-types";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta";
import { registerPostRoute } from "./post-route";

export const extensionRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Extension"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });

  registerPostRoute(fastify);
}
