/**
 * PATCH /api/me/onboarding/import-followup
 */

import type { AppRoutePlugin } from "../../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import {
  apiSuccessResponseSchema,
  updateImportFollowupBodySchema,
} from "@bondery/schemas";
import { getAuth } from "../../../lib/auth.js";
import { applyOpenApiRouteMeta } from "../../../lib/openapi-route-meta.js";
import { withOkResponse } from "../../../lib/openapi-route-responses.js";

export const meOnboardingImportFollowupRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.patch(
    "/",
    {
      schema: {
        description:
          "Record import follow-up intent after onboarding (awaiting export or dismissed).",
        body: updateImportFollowupBodySchema,
        response: withOkResponse(apiSuccessResponseSchema, "Import follow-up updated"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { status, platform } = request.body;

      const { error } = await client
        .from("user_settings")
        .update({
          import_followup_status: status,
          import_followup_platform: status === "awaiting_export" ? (platform ?? null) : null,
        })
        .eq("user_id", user.id);

      if (error) {
        request.log.error({ error }, "[onboarding] Failed to update import follow-up");
        return reply.status(500).send({ error: "Failed to update import follow-up" });
      }

      return { success: true };
    },
  );
};
