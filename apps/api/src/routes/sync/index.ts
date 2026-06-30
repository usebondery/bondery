import type { AppRoutePlugin } from "../../lib/fastify-types.js";
import { syncPushRoutes } from "./push.js";
import { syncPullRoutes } from "./pull.js";
import { syncBootstrapRoutes } from "./bootstrap.js";

export const syncRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  await fastify.register(syncPushRoutes);
  await fastify.register(syncPullRoutes);
  await fastify.register(syncBootstrapRoutes);
}
