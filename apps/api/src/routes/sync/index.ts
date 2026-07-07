import type { AppRoutePlugin } from "../../lib/fastify-types.js";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta.js";
import { syncPushRoutes } from "./push.js";
import { syncPullRoutes } from "./pull.js";
import { syncBootstrapRoutes } from "./bootstrap.js";
import { syncWsTicketRoutes } from "./ws-ticket.js";
import { syncWsRoutes } from "./ws.js";

export const syncRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });

  await fastify.register(syncBootstrapRoutes);
  await fastify.register(syncPullRoutes);
  await fastify.register(syncPushRoutes);
  await fastify.register(syncWsTicketRoutes);
  await fastify.register(syncWsRoutes);
}
