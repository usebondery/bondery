import { ReminderDigestEmail } from "@bondery/emails";
import type { ReminderDigestRequest } from "@bondery/schemas";
import { render } from "@react-email/render";
import nodemailer from "nodemailer";

export type ReminderDigestEmailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  address: string;
};

export type ReminderDigestResult = {
  success: boolean;
  targetDate: string;
  sentUsers: number;
  failedUsers: number;
  failures: Array<{ userId: string; email: string; error: string }>;
};

export async function sendReminderDigest(
  config: ReminderDigestEmailConfig,
  request: ReminderDigestRequest,
): Promise<ReminderDigestResult> {
  const { targetDate, users } = request;

  if (users.length === 0) {
    return {
      failedUsers: 0,
      failures: [],
      sentUsers: 0,
      success: true,
      targetDate,
    };
  }

  const transporter = nodemailer.createTransport({
    auth: {
      pass: config.pass,
      user: config.user,
    },
    host: config.host,
    port: config.port,
    secure: false,
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
          reminders: user.reminders.map((reminder) => ({
            date: reminder.date,
            note: reminder.note ?? null,
            notifyDaysBefore: reminder.notifyDaysBefore,
            notifyOn: reminder.notifyOn,
            personAvatar: reminder.personAvatar ?? null,
            personId: reminder.personId,
            personName: reminder.personName,
            type: reminder.type,
          })),
          targetDate: userTargetDate,
          userId: user.userId,
        }),
      );

      await transporter.sendMail({
        from: `Robot from Bondery <${config.address}>`,
        html: emailHtml,
        subject: `Bondery reminders for ${userTargetDate}`,
        to: user.email,
      });

      sentUsers += 1;
    } catch (error) {
      failures.push({
        email: user.email,
        error: error instanceof Error ? error.message : String(error),
        userId: user.userId,
      });
    }
  }

  return {
    failedUsers: failures.length,
    failures,
    sentUsers,
    success: failures.length === 0,
    targetDate,
  };
}
