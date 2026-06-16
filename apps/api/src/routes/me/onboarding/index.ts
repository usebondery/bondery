/**
 * Me Onboarding API Routes
 * Handles marking onboarding as complete
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "../../../lib/auth.js";

export async function meOnboardingRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Me"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * PATCH /api/me/onboarding/complete - Mark onboarding as completed
   *
   * Idempotent: only sets onboarding_completed_at if currently NULL.
   */
  fastify.patch("/", async (request: FastifyRequest, reply: FastifyReply) => {
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
