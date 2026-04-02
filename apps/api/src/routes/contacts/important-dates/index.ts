/**
 * Contacts — Important Dates Routes
 * Handles important dates (birthdays, anniversaries, etc.) and upcoming reminders.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../../lib/auth.js";
import { buildContactAvatarUrl } from "../../../lib/supabase.js";
import type { ImportantDateType, UpcomingReminder, Database } from "@bondery/types";
import {
  UuidParam,
  ImportantDateInputSchema,
  AvatarQualityEnum,
  AvatarSizeEnum,
  extractAvatarOptions,
} from "../../../lib/schemas.js";

// ── Constants ────────────────────────────────────────────────────

const IMPORTANT_DATE_SELECT = `
  id,
  user_id,
  person_id,
  type,
  date,
  note,
  notify_on,
  notify_days_before,
  created_at,
  updated_at
`;

export const IMPORTANT_DATE_TYPES = [
  "birthday",
  "anniversary",
  "nameday",
  "graduation",
  "other",
] satisfies ImportantDateType[];

export const IMPORTANT_DATE_NOTIFY_VALUES = [1, 3, 7] as const;

// ── TypeBox Schemas ──────────────────────────────────────────────

const ImportantDateTypeEnum = Type.Union([
  Type.Literal("birthday"),
  Type.Literal("anniversary"),
  Type.Literal("nameday"),
  Type.Literal("graduation"),
  Type.Literal("other"),
]);

const ImportantDatesBody = Type.Object({
  dates: Type.Array(ImportantDateInputSchema),
});

// ── Helpers ──────────────────────────────────────────────────────

export function isImportantDateType(value: string): value is ImportantDateType {
  return IMPORTANT_DATE_TYPES.includes(value as ImportantDateType);
}

export function isValidImportantDateNotifyDaysBefore(value: number): boolean {
  return (IMPORTANT_DATE_NOTIFY_VALUES as readonly number[]).includes(value);
}

function toContactPreview(
  person: {
    id: string;
    first_name: string;
    last_name: string | null;
  },
  avatarUrl: string | null,
) {
  return {
    id: person.id,
    firstName: person.first_name,
    lastName: person.last_name,
    avatar: avatarUrl,
  };
}

export function toImportantDate(event: {
  id: string;
  user_id: string;
  person_id: string;
  type: string;
  date: string;
  note: string | null;
  notify_on: string | null;
  notify_days_before: number | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: event.id,
    userId: event.user_id,
    personId: event.person_id,
    type: event.type,
    date: event.date,
    note: event.note,
    notifyOn: event.notify_on,
    notifyDaysBefore: event.notify_days_before,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

export function toIsoDateKey(value: string): string | null {
  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function deriveReminderDateKey(entry: {
  date: string;
  notify_on: string | null;
  notify_days_before: number | null;
}): string | null {
  if (entry.notify_on) {
    return toIsoDateKey(entry.notify_on);
  }

  if (entry.notify_days_before === null) {
    return null;
  }

  const dateKey = toIsoDateKey(entry.date);
  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const notificationDate = new Date(Date.UTC(year, month - 1, day));
  notificationDate.setUTCDate(notificationDate.getUTCDate() - entry.notify_days_before);

  return notificationDate.toISOString().slice(0, 10);
}

// ── Route Registration ───────────────────────────────────────────

export function registerImportantDateRoutes(fastify: FastifyInstance): void {
  /**
   * GET /api/contacts/important-dates/upcoming - List upcoming reminders with notification configured
   */
  fastify.get(
    "/important-dates/upcoming",
    {
      schema: {
        querystring: Type.Object({
          avatarQuality: Type.Optional(AvatarQualityEnum),
          avatarSize: Type.Optional(AvatarSizeEnum),
        }),
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { avatarQuality?: string; avatarSize?: string } }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const avatarOptions = extractAvatarOptions(request.query as any);

      const today = new Date();
      const startDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
      );
      const endDate = new Date(startDate);
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);

      const startDateIso = startDate.toISOString().slice(0, 10);
      const endDateIso = endDate.toISOString().slice(0, 10);

      const { data: rows, error } = await client
        .from("people_important_dates")
        .select(
          `${IMPORTANT_DATE_SELECT}, person:people!inner(id, first_name, last_name, updated_at)`,
        )
        .eq("user_id", user.id)
        .or("notify_days_before.not.is.null,notify_on.not.is.null")
        .order("date", { ascending: true });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      const reminderRows = (rows || []).filter((row) => {
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
        const { data: dispatchRows, error: dispatchError } = await client
          .from("reminder_dispatch_log")
          .select("reminder_date, created_at")
          .eq("user_id", user.id)
          .in("reminder_date", reminderDateKeys)
          .order("created_at", { ascending: false });

        if (dispatchError) {
          return reply.status(500).send({ error: dispatchError.message });
        }

        latestDispatchByReminderDate = (dispatchRows || []).reduce((accumulator, row) => {
          const typedRow = row as Pick<
            Database["public"]["Tables"]["reminder_dispatch_log"]["Row"],
            "reminder_date" | "created_at"
          >;

          if (!accumulator.has(typedRow.reminder_date)) {
            accumulator.set(typedRow.reminder_date, typedRow.created_at);
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

          const reminderDateKey = deriveReminderDateKey(row);
          const notificationSentAt = reminderDateKey
            ? latestDispatchByReminderDate.get(reminderDateKey) || null
            : null;

          return {
            importantDate: toImportantDate(row),
            person: toContactPreview(
              person,
              buildContactAvatarUrl(client, user.id, person.id, avatarOptions, person.updated_at),
            ),
            notificationSent: Boolean(notificationSentAt),
            notificationSentAt,
          };
        })
        .filter((value): value is UpcomingReminder => Boolean(value))
        .sort((a, b) => {
          const aReminderDate = deriveReminderDateKey({
            date: a.importantDate.date,
            notify_on: a.importantDate.notifyOn,
            notify_days_before: a.importantDate.notifyDaysBefore,
          });
          const bReminderDate = deriveReminderDateKey({
            date: b.importantDate.date,
            notify_on: b.importantDate.notifyOn,
            notify_days_before: b.importantDate.notifyDaysBefore,
          });

          if (aReminderDate && bReminderDate && aReminderDate !== bReminderDate) {
            return aReminderDate.localeCompare(bReminderDate);
          }

          return a.importantDate.date.localeCompare(b.importantDate.date);
        });

      return { reminders };
    },
  );

  /**
   * GET /api/contacts/:id/important-dates - Get normalized important dates for a person
   */
  fastify.get(
    "/:id/important-dates",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;

      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      const { data: rows, error: rowsError } = await client
        .from("people_important_dates")
        .select(IMPORTANT_DATE_SELECT)
        .eq("user_id", user.id)
        .eq("person_id", personId)
        .order("created_at", { ascending: true });

      if (rowsError) {
        return reply.status(500).send({ error: rowsError.message });
      }

      return {
        dates: (rows || []).map(toImportantDate),
      };
    },
  );

  /**
   * PUT /api/contacts/:id/important-dates - Replace normalized important dates for a person
   */
  fastify.put(
    "/:id/important-dates",
    { schema: { params: UuidParam, body: ImportantDatesBody } },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Body: typeof ImportantDatesBody.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;
      const dates = request.body.dates;

      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      const replaceRows = dates.map((event) => ({
        id: event.id,
        user_id: user.id,
        person_id: personId,
        type: event.type,
        date: event.date,
        note: event.note?.trim() ? event.note.trim() : null,
        notify_days_before: event.notifyDaysBefore ?? null,
      }));

      const { error: deleteError } = await client
        .from("people_important_dates")
        .delete()
        .eq("user_id", user.id)
        .eq("person_id", personId);

      if (deleteError) {
        return reply.status(500).send({ error: deleteError.message });
      }

      if (replaceRows.length === 0) {
        return { dates: [] };
      }

      const { data: insertedRows, error: insertError } = await client
        .from("people_important_dates")
        .insert(replaceRows)
        .select(IMPORTANT_DATE_SELECT)
        .order("created_at", { ascending: true });

      if (insertError) {
        if (insertError.code === "23505") {
          return reply.status(409).send({ error: "Duplicate important date" });
        }

        return reply.status(500).send({ error: insertError.message });
      }

      return {
        dates: (insertedRows || []).map(toImportantDate),
      };
    },
  );
}
