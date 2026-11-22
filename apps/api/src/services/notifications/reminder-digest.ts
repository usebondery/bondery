import { Prisma, prisma } from "@bondery/db";
import { ReminderDigestEmail } from "@bondery/emails";
import type { ReminderDigestRequest, ReminderDigestUser } from "@bondery/schemas";
import {
  appSettingsUrl,
  emailDocumentProps,
  resolveAppOrigin,
} from "../../lib/notifications/email-chrome.js";
import { buildReminderDigestCopy } from "../../lib/notifications/email-copy-builders.js";
import { formatEmailFrom } from "../../lib/notifications/email-from.js";
import {
  defaultEmailFormatContext,
  type EmailFormatContext,
  formatEmailDateFromIso,
  getPreloadedCopy,
  interpolateCopy,
  preloadEmailNamespaces,
  readCopyString,
  resolveEmailLocalesForUsers,
} from "../../lib/notifications/email-i18n.js";
import { renderEmailParts } from "../../lib/notifications/render-email.js";
import {
  isEmailConfigured,
  requireEmailConfig,
  sendRenderedEmail,
} from "../../lib/notifications/transporter.js";

type ReminderDigestResult = {
  success: boolean;
  targetDate: string;
  sentUsers: number;
  failedUsers: number;
  failures: Array<{ userId: string; email: string; error: string }>;
};

type SendOneUserDigestContext = {
  defaultTargetDate: string;
  formatByUserId: Map<string, EmailFormatContext>;
  namespaceCache: ReturnType<typeof preloadEmailNamespaces>;
};

function getDaysRemaining(targetDate: string, date: string): number | null {
  const target = new Date(`${targetDate}T00:00:00Z`);
  const event = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(target.getTime()) || Number.isNaN(event.getTime())) {
    return null;
  }

  const millisecondsInDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((event.getTime() - target.getTime()) / millisecondsInDay));
}

function buildRemainingLabel(
  copy: ReturnType<typeof buildReminderDigestCopy>,
  targetDate: string,
  date: string,
  notifyDaysBefore: number,
): string {
  const daysRemaining = getDaysRemaining(targetDate, date);
  if (daysRemaining === null) {
    return interpolateCopy(copy.dayMany, { count: notifyDaysBefore });
  }

  if (daysRemaining === 1) {
    return copy.dayOne;
  }

  return interpolateCopy(copy.dayMany, { count: daysRemaining });
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function advanceUserReminderSchedule(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE user_settings us
    SET next_reminder_at_utc = compute_next_reminder_at_utc(
      us.timezone,
      us.reminder_send_hour,
      now()
    )
    WHERE us.user_id = ${userId}::uuid
  `;
}

async function recordDispatchLog(
  userId: string,
  reminderDate: Date,
  timezone: string,
): Promise<"created" | "already_sent"> {
  try {
    await prisma.reminderDispatchLog.create({
      data: {
        reminderDate,
        timezone,
        userId,
      },
    });
    return "created";
  } catch (error) {
    if (isUniqueViolation(error)) {
      return "already_sent";
    }
    throw error;
  }
}

export type { ReminderDigestResult, SendOneUserDigestContext };

export async function sendOneUserDigest(
  user: ReminderDigestUser,
  ctx: SendOneUserDigestContext,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (user.reminders.length === 0) {
    return { ok: true };
  }

  if (!isEmailConfigured()) {
    return { error: "SMTP is not configured", ok: false };
  }

  const config = requireEmailConfig();
  const userTargetDate = user.targetDate ?? ctx.defaultTargetDate;
  const formatCtx = ctx.formatByUserId.get(user.userId) ?? defaultEmailFormatContext();
  const lng = formatCtx.locale;
  const bundle = getPreloadedCopy(ctx.namespaceCache, lng);
  const copy = buildReminderDigestCopy(bundle);
  const formattedHeadingDate = formatEmailDateFromIso(userTargetDate, formatCtx, "long");
  const subject = readCopyString(bundle, "subject", { targetDate: formattedHeadingDate });

  try {
    const { html, text } = await renderEmailParts(
      ReminderDigestEmail({
        ...emailDocumentProps(lng, subject),
        appOrigin: resolveAppOrigin(),
        copy,
        formattedHeadingDate,
        manageNotificationsUrl: appSettingsUrl(),
        reminders: user.reminders.map((reminder) => {
          const type = reminder.type;
          const typeLabel = copy.dateTypes[type];
          return {
            date: reminder.date,
            dateLabel: formatEmailDateFromIso(reminder.date, formatCtx),
            note: reminder.note ?? null,
            notifyDaysBefore: reminder.notifyDaysBefore,
            notifyOn: reminder.notifyOn,
            personAvatar: reminder.personAvatar ?? null,
            personId: reminder.personId,
            personName: reminder.personName,
            remainingLabel: buildRemainingLabel(
              copy,
              userTargetDate,
              reminder.date,
              reminder.notifyDaysBefore,
            ),
            type,
            typeLabel,
          };
        }),
        targetDate: userTargetDate,
        userId: user.userId,
      }),
    );

    await sendRenderedEmail({
      from: formatEmailFrom(config.fromAddress),
      html,
      replyTo: config.replyToAddress,
      subject,
      text,
      to: user.email,
    });

    const reminderDate = new Date(`${userTargetDate}T00:00:00.000Z`);
    const dispatchStatus = await recordDispatchLog(
      user.userId,
      reminderDate,
      user.timezone ?? "UTC",
    );

    if (dispatchStatus === "created") {
      await advanceUserReminderSchedule(user.userId);
    }

    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    };
  }
}

export async function sendReminderDigest(
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

  if (!isEmailConfigured()) {
    return {
      failedUsers: users.length,
      failures: users.map((user) => ({
        email: user.email,
        error: "SMTP is not configured",
        userId: user.userId,
      })),
      sentUsers: 0,
      success: false,
      targetDate,
    };
  }

  const namespaceCache = preloadEmailNamespaces("ReminderDigestEmail");
  const formatByUserId = await resolveEmailLocalesForUsers(users.map((user) => user.userId));
  const ctx: SendOneUserDigestContext = {
    defaultTargetDate: targetDate,
    formatByUserId,
    namespaceCache,
  };

  const failures: Array<{ userId: string; email: string; error: string }> = [];
  let sentUsers = 0;

  for (const user of users) {
    const result = await sendOneUserDigest(user, ctx);
    if (result.ok) {
      if (user.reminders.length > 0) {
        sentUsers += 1;
      }
      continue;
    }

    failures.push({
      email: user.email,
      error: result.error,
      userId: user.userId,
    });
  }

  return {
    failedUsers: failures.length,
    failures,
    sentUsers,
    success: failures.length === 0,
    targetDate,
  };
}
