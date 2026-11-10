import { syncWsTicketResponseSchema } from "@bondery/schemas/sync";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withUnmeteredOkResponse } from "../../lib/platform/openapi/responses.js";
import { requireSyncWakeRuntime } from "../../lib/sync/wake/index.js";

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
        response: withUnmeteredOkResponse(syncWsTicketResponseSchema, "WebSocket ticket"),
        summary: "Fetch a sync WebSocket ticket",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { user } = getAuth(request);
      const runtime = requireSyncWakeRuntime();
      return runtime.tickets.issue(user.id);
    },
  );
};
