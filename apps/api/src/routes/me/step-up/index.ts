import { stepUpTokenResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { mintStepUpToken } from "../../../lib/auth/step-up-redis.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withCreatedResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

export const meStepUpRoutes: AppRoutePlugin = async (fastify) => {
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
          "Mint a one-shot step-up token. Requires a fresh Better Auth session cookie; JWT-only callers are rejected.",
        response: withCreatedResponse(stepUpTokenResponseSchema, "Step-up token"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, _route, reply) => {
      const token = await mintStepUpToken(ctx.user.id);
      reply.status(201);
      return { token };
    }),
  );
};
