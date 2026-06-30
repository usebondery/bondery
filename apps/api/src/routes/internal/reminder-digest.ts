import type { FastifyInstance, FastifyReply } from "fastify";
import type { AppFastifyInstance, AppRoutePlugin } from "../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { ReminderDigestEmail } from "@bondery/emails";
import { reminderDigestRequestSchema } from "@bondery/schemas";

export const reminderDigestRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Internal"];
    }
  });

  fastify.post(
    "/",
    {
      schema: {
        body: reminderDigestRequestSchema,
      } satisfies FastifyZodOpenApiSchema,
      onRequest: fastify.auth([fastify.verifyServiceSecret]),
      config: { rateLimit: false },
    },
    async (request, reply) => {
      const { targetDate, users } = request.body;

      request.log.info(
        { targetDate, userCount: users.length },
        "Received reminder digest request",
      );

      if (users.length === 0) {
        return reply.send({
          success: true,
          targetDate,
          sentUsers: 0,
          failedUsers: 0,
        });
      }

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

      const failures: Array<{ userId: string; email: string; error: string }> =
        [];
      let sentUsers = 0;

      for (const user of users) {
        if (user.reminders.length === 0) {
          continue;
        }

        const userTargetDate = user.targetDate ?? targetDate;

        try {
          const emailHtml = await render(
            ReminderDigestEmail({
              userId: user.userId,
              targetDate: userTargetDate,
              reminders: user.reminders.map((reminder) => ({
                personId: reminder.personId,
                personName: reminder.personName,
                personAvatar: reminder.personAvatar ?? null,
                type: reminder.type,
                date: reminder.date,
                notifyOn: reminder.notifyOn,
                notifyDaysBefore: reminder.notifyDaysBefore,
                note: reminder.note ?? null,
              })),
            }),
          );

          await transporter.sendMail({
            from: `Robot from Bondery <${fastify.config.PRIVATE_EMAIL_ADDRESS}>`,
            to: user.email,
            subject: `Bondery reminders for ${userTargetDate}`,
            html: emailHtml,
          });

          sentUsers += 1;
        } catch (error) {
          failures.push({
            userId: user.userId,
            email: user.email,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return reply.send({
        success: failures.length === 0,
        targetDate,
        sentUsers,
        failedUsers: failures.length,
        failures,
      });
    },
  );
}
