/**
 * Me Feedback API Routes
 * Handles user feedback submission and sends email notification
 */

import { apiSuccessResponseSchema, feedbackFormSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { sendFeedbackEmail } from "../../../services/notifications/feedback.js";

/**
 * POST /api/me/feedback - Submit feedback
 */
export const meFeedbackRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  fastify.post(
    "/",
    {
      schema: {
        body: feedbackFormSchema,
        description: "Submit user feedback and send a notification email.",
        response: withOkResponse(apiSuccessResponseSchema, "Feedback submitted"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { user } = getAuth(request);
      const { npsScore, npsReason, generalFeedback } = request.body;

      await sendFeedbackEmail(
        {
          address: fastify.config.PRIVATE_EMAIL_ADDRESS,
          host: fastify.config.PRIVATE_EMAIL_HOST,
          pass: fastify.config.PRIVATE_EMAIL_PASS,
          port: Number(fastify.config.PRIVATE_EMAIL_PORT),
          user: fastify.config.PRIVATE_EMAIL_USER,
        },
        {
          generalFeedback,
          npsReason,
          npsScore,
          userEmail: user.email || "unknown",
          userId: user.id,
        },
      );

      return { success: true };
    },
  );
};
