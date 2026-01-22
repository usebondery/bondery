/**
 * Feedback API Routes
 * Handles user feedback submission and sends email notification
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import { FeedbackEmail } from "@bondery/emails";

interface FeedbackBody {
  npsScore: number;
  npsReason: string;
  generalFeedback: string;
}

/**
 * POST /api/feedback - Submit feedback
 */
export async function feedbackRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/",
    async (request: FastifyRequest<{ Body: FeedbackBody }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { user } = auth;
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

      console.log("seding");
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
          subject: `New feedback`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error("Error sending feedback email:", emailError);
        return reply.status(500).send({
          error: "Failed to render or send feedback email",
          details: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }

      return { success: true };
    },
  );
}
