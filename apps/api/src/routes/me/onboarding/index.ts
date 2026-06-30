/**
 * Me Onboarding API Routes
 * Handles marking onboarding as complete
 */

import type { FastifyReply } from "fastify";
import type { AppRoutePlugin } from "../../../lib/fastify-types.js";
import { getAuth } from "../../../lib/auth.js";

export const meOnboardingRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * PATCH /api/me/onboarding/complete - Mark onboarding as completed
   *
   * Idempotent: only sets onboarding_completed_at if currently NULL.
   */
  fastify.patch("/", async (request, reply) => {
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
