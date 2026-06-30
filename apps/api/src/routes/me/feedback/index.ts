/**
 * Me Feedback API Routes
 * Handles user feedback submission and sends email notification
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import type { AppFastifyInstance, AppRoutePlugin } from "../../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { feedbackFormSchema } from "@bondery/schemas";
import { getAuth } from "../../../lib/auth.js";
import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { FeedbackEmail } from "@bondery/emails";

/**
 * POST /api/me/feedback - Submit feedback
 */
export const meFeedbackRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.post(
    "/",
    {
      schema: {
        body: feedbackFormSchema,
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { user } = getAuth(request);
      const { npsScore, npsReason, generalFeedback } = request.body;

      const userEmail = user.email || "unknown";
      const timestamp = new Date().toISOString();

      const transporter = nodemailer.createTransport({
        host: fastify.config.PRIVATE_EMAIL_HOST,
        port: Number(fastify.config.PRIVATE_EMAIL_PORT),
        secure: false,
        auth: {
          user: fastify.config.PRIVATE_EMAIL_USER,
          pass: fastify.config.PRIVATE_EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      try {
        const emailHtml = await render(
          FeedbackEmail({
            userEmail,
            userId: user.id,
            npsScore,
            npsReason: npsReason || undefined,
            generalFeedback: generalFeedback || undefined,
            timestamp,
          }),
        );

        await transporter.sendMail({
          from: `Robot from Bondery <${fastify.config.PRIVATE_EMAIL_ADDRESS}>`,
          to: `Robot from Bondery <${fastify.config.PRIVATE_EMAIL_ADDRESS}>`,
          cc: userEmail,
          replyTo: userEmail,
          subject: `New feedback about Bondery`,
          html: emailHtml,
        });
      } catch (emailError) {
        request.log.error({ err: emailError }, "Error sending feedback email");
        return reply.status(500).send({
          error: "Failed to render or send feedback email",
          details:
            emailError instanceof Error
              ? emailError.message
              : String(emailError),
        });
      }

      return { success: true };
    },
  );
}
