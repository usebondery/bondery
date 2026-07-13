/**
 * Me Initialize API Routes — idempotent signup setup (writes).
 */

import { noContentResponse } from "@bondery/schemas/http/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { initializeUserDefaults } from "../../../services/me/session.js";

export const meInitializeRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  fastify.post(
    "/",
    {
      schema: {
        description:
          "Initialize default user settings and sync provider avatar after signup. Idempotent.",
        response: {
          ...noContentResponse,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, _route, reply) => {
      await initializeUserDefaults(ctx);
      return reply.status(204).send(null);
    }),
  );
};
