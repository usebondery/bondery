/**
 * Extension API Routes
 * Handles browser extension integration for creating/updating contacts
 */

import type { AppRoutePlugin } from "../../lib/fastify-types.js";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta.js";
import { registerPostRoute } from "./post-route.js";

export const extensionRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Extension"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });

  registerPostRoute(fastify);
}
