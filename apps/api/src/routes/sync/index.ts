import type { AppRoutePlugin } from "../../lib/fastify-types";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta";
import { syncPushRoutes } from "./push";
import { syncPullRoutes } from "./pull";
import { syncBootstrapRoutes } from "./bootstrap";

export const syncRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });

  await fastify.register(syncPushRoutes);
  await fastify.register(syncPullRoutes);
  await fastify.register(syncBootstrapRoutes);
}
