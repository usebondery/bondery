import type { AvatarTransformOptions, UpcomingReminder } from "@bondery/schemas";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import {
  deriveReminderDateKey,
  toImportantDateFromPrisma,
} from "../../lib/contacts/important-dates.js";
import { notFound } from "../../lib/platform/errors/http-errors.js";
import { toContactPreview } from "./queries-shared.js";

export async function listContactImportantDates(ctx: DomainContext, personId: string) {
  const db = domainDb(ctx);
  const { user } = ctx;

  const person = await db.people.findFirst({
    select: { id: true },
    where: { id: personId, userId: user.id },
  });

  if (!person) {
    throw notFound("Contact not found", "contact_not_found");
  }

  const rows = await db.peopleImportantDate.findMany({
    orderBy: { createdAt: "asc" },
    where: { personId, userId: user.id },
  });

  return {
    dates: rows.map(toImportantDateFromPrisma),
  };
}

export async function listUpcomingReminders(
  ctx: DomainContext,
  avatarOptions?: AvatarTransformOptions,
) {
  const db = domainDb(ctx);
  const { user } = ctx;

  const today = new Date();
  const startDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);

  const startDateIso = startDate.toISOString().slice(0, 10);
  const endDateIso = endDate.toISOString().slice(0, 10);

  const rows = await db.peopleImportantDate.findMany({
    include: {
      person: {
        select: {
          firstName: true,
          hasAvatar: true,
          id: true,
          lastName: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { date: "asc" },
    where: {
      OR: [{ notifyDaysBefore: { not: null } }, { notifyOn: { not: null } }],
      userId: user.id,
    },
  });

  const reminderRows = rows.filter((row) => {
    const reminderDateKey = deriveReminderDateKey(row);
    if (!reminderDateKey) {
      return false;
    }

    return reminderDateKey >= startDateIso && reminderDateKey <= endDateIso;
  });

  const reminderDateKeys = Array.from(
    new Set(
      reminderRows
        .map((row) => deriveReminderDateKey(row))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let latestDispatchByReminderDate = new Map<string, string>();
  if (reminderDateKeys.length > 0) {
    const dispatchRows = await db.reminderDispatchLog.findMany({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, reminderDate: true },
      where: {
        reminderDate: { in: reminderDateKeys.map((key) => new Date(`${key}T00:00:00.000Z`)) },
        userId: user.id,
      },
    });

    latestDispatchByReminderDate = dispatchRows.reduce((accumulator, row) => {
      const reminderDateKey = row.reminderDate.toISOString().slice(0, 10);
      if (!accumulator.has(reminderDateKey)) {
        accumulator.set(reminderDateKey, row.createdAt.toISOString());
      }

      return accumulator;
    }, new Map<string, string>());
  }

  const reminders: UpcomingReminder[] = reminderRows
    .map((row) => {
      const person = row.person;
      if (!person) {
        return null;
      }

      const importantDate = toImportantDateFromPrisma(row);
      const reminderDateKey = deriveReminderDateKey(row);
      const notificationSentAt = reminderDateKey
        ? latestDispatchByReminderDate.get(reminderDateKey) || null
        : null;

      return {
        importantDate,
        notificationSent: Boolean(notificationSentAt),
        notificationSentAt,
        person: toContactPreview(
          user.id,
          {
            firstName: person.firstName,
            hasAvatar: person.hasAvatar,
            id: person.id,
            lastName: person.lastName,
            updatedAt: person.updatedAt.toISOString(),
          },
          avatarOptions,
        ),
      };
    })
    .filter((value): value is NonNullable<typeof value> => value != null)
    .sort((a, b) => {
      const aReminderDate = deriveReminderDateKey({
        date: a.importantDate.date,
        notifyDaysBefore: a.importantDate.notifyDaysBefore,
        notifyOn: a.importantDate.notifyOn,
      });
      const bReminderDate = deriveReminderDateKey({
        date: b.importantDate.date,
        notifyDaysBefore: b.importantDate.notifyDaysBefore,
        notifyOn: b.importantDate.notifyOn,
      });

      if (aReminderDate && bReminderDate && aReminderDate !== bReminderDate) {
        return aReminderDate.localeCompare(bReminderDate);
      }

      return a.importantDate.date.localeCompare(b.importantDate.date);
    });

  return { reminders };
}
