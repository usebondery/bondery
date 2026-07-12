/**
 * PATCH /api/me/onboarding/import-followup
 */

import { apiSuccessResponseSchema, updateImportFollowupBodySchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { updateImportFollowup } from "../../../services/me/onboarding.js";

export const meOnboardingImportFollowupRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  fastify.patch(
    "/",
    {
      schema: {
        body: updateImportFollowupBodySchema,
        description:
          "Record import follow-up intent after onboarding (awaiting export or dismissed).",
        response: withOkResponse(apiSuccessResponseSchema, "Import follow-up updated"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: updateImportFollowupBodySchema }, async (ctx, { body }) =>
      updateImportFollowup(ctx, {
        platform: body.platform,
        status: body.status,
      }),
    ),
  );
};
