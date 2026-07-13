/**
 * Me Onboarding API Routes
 */

import { apiSuccessResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { completeOnboarding } from "../../../services/me/onboarding.js";

export const meOnboardingRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  fastify.patch(
    "/",
    {
      schema: {
        description:
          "Mark onboarding as completed. Idempotent — only sets onboarding_completed_at if currently null.",
        response: withOkResponse(apiSuccessResponseSchema, "Onboarding completed"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => completeOnboarding(ctx)),
  );
};
