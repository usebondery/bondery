import { syncWsTicketResponseSchema } from "@bondery/schemas/sync";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { getSyncWakeRuntime, initSyncWakeRuntime } from "../../lib/sync/wake/index.js";

export const syncWsTicketRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Sync"];
    }
  });

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
