import type { AppRoutePlugin } from "../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { syncWsTicketResponseSchema } from "@bondery/schemas/sync";
import { getAuth } from "../../lib/auth.js";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta.js";
import { withOkResponse } from "../../lib/openapi-route-responses.js";
import { getSyncWakeRuntime, initSyncWakeRuntime } from "../../lib/sync/wake/index.js";

export const syncWsTicketRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Sync"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.get(
    "/ws-ticket",
    {
      config: {
        rateLimit: false,
      },
      schema: {
        description: "Issue a short-lived WebSocket ticket for sync wake notifications.",
        response: withOkResponse(syncWsTicketResponseSchema, "WebSocket ticket"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { user } = getAuth(request);
      const runtime = getSyncWakeRuntime() ?? (await initSyncWakeRuntime(request.log));
      return runtime.tickets.issue(user.id);
    },
  );
};
