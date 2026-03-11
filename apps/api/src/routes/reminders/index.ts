import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Type } from "@sinclair/typebox";
import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import { ReminderDigestEmail } from "@bondery/emails";

const ReminderDigestItemSchema = Type.Object({
  personId: Type.String(),
  personName: Type.String(),
  personAvatar: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  type: Type.Union([
    Type.Literal("birthday"),
    Type.Literal("anniversary"),
    Type.Literal("nameday"),
    Type.Literal("graduation"),
    Type.Literal("other"),
  ]),
  date: Type.String(),
  notifyOn: Type.String(),
  notifyDaysBefore: Type.Union([Type.Literal(1), Type.Literal(3), Type.Literal(7)]),
  note: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

const ReminderDigestUserSchema = Type.Object({
  userId: Type.String(),
  email: Type.String(),
  timezone: Type.Optional(Type.String()),
  targetDate: Type.Optional(Type.String()),
  reminders: Type.Array(ReminderDigestItemSchema),
});

const ReminderDigestBody = Type.Object({
  targetDate: Type.String(),
  users: Type.Array(ReminderDigestUserSchema),
});

export async function reminderRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Reminders"] };
  });

  fastify.post(
    "/daily-digest",
    {
      schema: { body: ReminderDigestBody },
      onRequest: fastify.auth([fastify.verifyServiceSecret]),
    },
    async (
      request: FastifyRequest<{ Body: typeof ReminderDigestBody.static }>,
      reply: FastifyReply,
    ) => {
      const { targetDate, users } = request.body;

      request.log.info({ targetDate, userCount: users.length }, "Received reminder digest request");

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

      const failures: Array<{ userId: string; email: string; error: string }> = [];
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
