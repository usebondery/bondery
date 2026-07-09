import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { openApiAreaRoutes, sessionRoutes } from "../../lib/platform/route-areas.js";
import { syncBootstrapRoutes } from "./bootstrap.js";
import { syncPullRoutes } from "./pull.js";
import { syncPushRoutes } from "./push.js";
import { syncWsRoutes } from "./ws.js";
import { syncWsTicketRoutes } from "./ws-ticket.js";

export const syncRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  await fastify.register(
    sessionRoutes(async (http) => {
      await http.register(syncBootstrapRoutes);
      await http.register(syncPullRoutes);
      await http.register(syncPushRoutes);
      await http.register(syncWsTicketRoutes);
    }),
  );
  await fastify.register(openApiAreaRoutes("session", syncWsRoutes));
};
