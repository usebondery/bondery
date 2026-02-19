import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import { ReminderDigestEmail } from "@bondery/emails";

interface ReminderDigestItem {
  personId: string;
  personName: string;
  personAvatar: string | null;
  eventType: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
  eventDate: string;
  notifyOn: string;
  notifyDaysBefore: 1 | 3 | 7;
  note: string | null;
}

interface ReminderDigestUser {
  userId: string;
  email: string;
  timezone?: string;
  targetDate?: string;
  reminders: ReminderDigestItem[];
}

interface ReminderDigestRequestBody {
  targetDate: string;
  users: ReminderDigestUser[];
}

function isReminderDigestRequestBody(value: unknown): value is ReminderDigestRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ReminderDigestRequestBody>;

  if (typeof candidate.targetDate !== "string" || !Array.isArray(candidate.users)) {
    return false;
  }

  return candidate.users.every((user) => {
    if (!user || typeof user !== "object") {
      return false;
    }

    const userCandidate = user as Partial<ReminderDigestUser>;
    if (
      typeof userCandidate.userId !== "string" ||
      typeof userCandidate.email !== "string" ||
      (userCandidate.targetDate !== undefined && typeof userCandidate.targetDate !== "string") ||
      !Array.isArray(userCandidate.reminders)
    ) {
      return false;
    }

    return userCandidate.reminders.every((reminder) => {
      if (!reminder || typeof reminder !== "object") {
        return false;
      }

      const reminderCandidate = reminder as Partial<ReminderDigestItem>;
      return (
        typeof reminderCandidate.personId === "string" &&
        typeof reminderCandidate.personName === "string" &&
        (typeof reminderCandidate.personAvatar === "string" ||
          reminderCandidate.personAvatar === null ||
          reminderCandidate.personAvatar === undefined) &&
        typeof reminderCandidate.eventType === "string" &&
        typeof reminderCandidate.eventDate === "string" &&
        typeof reminderCandidate.notifyOn === "string" &&
        (reminderCandidate.notifyDaysBefore === 1 ||
          reminderCandidate.notifyDaysBefore === 3 ||
          reminderCandidate.notifyDaysBefore === 7) &&
        (typeof reminderCandidate.note === "string" ||
          reminderCandidate.note === null ||
          reminderCandidate.note === undefined)
      );
    });
  });
}

export async function reminderRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/daily-digest",
    async (request: FastifyRequest<{ Body: ReminderDigestRequestBody }>, reply: FastifyReply) => {
      const providedSecret = request.headers["x-reminder-job-secret"];

      if (
        typeof providedSecret !== "string" ||
        providedSecret !== fastify.config.PRIVATE_BONDERY_SUPABASE_HTTP_KEY
      ) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      if (!isReminderDigestRequestBody(request.body)) {
        return reply.status(400).send({ error: "Invalid reminder payload" });
      }

      const { targetDate, users } = request.body;

      console.log(
        `Received reminder digest request for ${targetDate} with ${users.length} user(s)`,
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
                eventType: reminder.eventType,
                eventDate: reminder.eventDate,
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
