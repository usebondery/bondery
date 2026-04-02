/**
 * Me Feedback API Routes
 * Handles user feedback submission and sends email notification
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../../lib/auth.js";
import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import { FeedbackEmail } from "@bondery/emails";

// ── TypeBox Schemas ──────────────────────────────────────────────────────────

const FeedbackBody = Type.Object({
  npsScore: Type.Integer({ minimum: 0, maximum: 10 }),
  npsReason: Type.String(),
  generalFeedback: Type.String(),
});

/**
 * POST /api/me/feedback - Submit feedback
 */
export async function meFeedbackRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Me"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.post(
    "/",
    { schema: { body: FeedbackBody } },
    async (
      request: FastifyRequest<{
        Body: { npsScore: number; npsReason: string; generalFeedback: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { user } = getAuth(request);
      const { npsScore, npsReason, generalFeedback } = request.body;

      const userEmail = user.email || "unknown";
      const timestamp = new Date().toISOString();

      // Create nodemailer transporter
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

      // Render email template using React Email
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

        // Send email
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
          details: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }

      return { success: true };
    },
  );
}
