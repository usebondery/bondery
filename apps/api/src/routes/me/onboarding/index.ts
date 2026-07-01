/**
 * Me Onboarding API Routes
 * Handles marking onboarding as complete
 */

import type { FastifyReply } from "fastify";
import type { AppRoutePlugin } from "../../../lib/fastify-types";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { apiSuccessResponseSchema } from "@bondery/schemas";
import { getAuth } from "../../../lib/auth";
import { applyOpenApiRouteMeta } from "../../../lib/openapi-route-meta";
import { withOkResponse } from "../../../lib/openapi-route-responses";

export const meOnboardingRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * PATCH /api/me/onboarding/complete - Mark onboarding as completed
   *
   * Idempotent: only sets onboarding_completed_at if currently NULL.
   */
  fastify.patch(
    "/",
    {
      schema: {
        description:
          "Mark onboarding as completed. Idempotent — only sets onboarding_completed_at if currently null.",
        response: withOkResponse(apiSuccessResponseSchema, "Onboarding completed"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
    const { client, user } = getAuth(request);

    const { error } = await client
      .from("user_settings")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("onboarding_completed_at", null);

    if (error) {
      request.log.error({ error }, "[onboarding] Failed to mark onboarding complete");
      return reply.status(500).send({ error: "Failed to complete onboarding" });
    }

    return { success: true };
  });
}
