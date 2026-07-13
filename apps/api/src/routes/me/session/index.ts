/**
 * Me Session API Routes — lean layout probe (read-only).
 */

import { userSessionResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { internal } from "../../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { getUserSession } from "../../../services/me/session.js";

export const meSessionRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  fastify.get(
    "/",
    {
      schema: {
        description:
          "Get layout session context: display identity, locale inputs, and onboarding state.",
        response: withOkResponse(userSessionResponseSchema, "User session"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => {
      try {
        const data = await getUserSession(ctx);
        return { data, success: true as const };
      } catch (error) {
        throw internal("session_fetch_failed", error);
      }
    }),
  );
};
