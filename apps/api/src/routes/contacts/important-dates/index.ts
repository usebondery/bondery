/**
 * Contacts — Important Dates Routes
 * Handles important dates (birthdays, anniversaries, etc.) and upcoming reminders.
 */

import type { Database, ImportantDateType, UpcomingReminder } from "@bondery/schemas";
import {
  importantDatesListResponseSchema,
  upcomingRemindersResponseSchema,
} from "@bondery/schemas";
import {
  avatarTransformQuerySchema,
  importantDatesReplaceBodySchema,
  uuidParamSchema,
} from "@bondery/schemas/http";
import { conflictResponse } from "@bondery/schemas/http/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { replaceImportantDates } from "../../../domains/contacts/important-dates.js";
import {
  deriveReminderDateKey,
  IMPORTANT_DATE_SELECT,
  toImportantDate,
} from "../../../lib/contacts/important-dates.js";
import { extractAvatarOptions } from "../../../lib/data/select-fragments.js";
import { resolveContactAvatarUrl } from "../../../lib/data/supabase.js";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import { internal, notFound } from "../../../lib/platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

export const IMPORTANT_DATE_TYPES = [
  "birthday",
  "anniversary",
  "nameday",
  "graduation",
  "other",
] satisfies ImportantDateType[];

export const IMPORTANT_DATE_NOTIFY_VALUES = [1, 3, 7] as const;

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
    avatar: avatarUrl,
    firstName: person.first_name,
    id: person.id,
    lastName: person.last_name,
  };
}

export {
  deriveReminderDateKey,
  toImportantDate,
  toIsoDateKey,
} from "../../../lib/contacts/important-dates.js";

// ── Route Registration ───────────────────────────────────────────

export function registerUpcomingImportantDateRoutes(fastify: AppFastifyInstance): void {
  /**
   * GET /api/contacts/important-dates/upcoming - List upcoming reminders with notification configured
   */
  fastify.get(
    "/important-dates/upcoming",
    {
      schema: {
        description: "List upcoming important-date reminders with notifications configured.",
        querystring: avatarTransformQuerySchema,
        response: withOkResponse(upcomingRemindersResponseSchema, "Upcoming reminders"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const avatarOptions = extractAvatarOptions(request.query);

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
          `${IMPORTANT_DATE_SELECT}, person:people!inner(id, first_name, last_name, updated_at, has_avatar)`,
        )
        .eq("user_id", user.id)
        .or("notify_days_before.not.is.null,notify_on.not.is.null")
        .order("date", { ascending: true });

      if (error) {
        throw internal("internal_server_error", error.message);
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
          throw internal("internal_server_error", dispatchError.message);
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
            notificationSent: Boolean(notificationSentAt),
            notificationSentAt,
            person: toContactPreview(
              person,
              resolveContactAvatarUrl(
                client,
                user.id,
                {
                  hasAvatar: person.has_avatar,
                  id: person.id,
                  updatedAt: person.updated_at,
                },
                avatarOptions,
              ),
            ),
          };
        })
        .filter((value): value is NonNullable<typeof value> => value != null)
        .sort((a, b) => {
          const aReminderDate = deriveReminderDateKey({
            date: a.importantDate.date,
            notify_days_before: a.importantDate.notifyDaysBefore,
            notify_on: a.importantDate.notifyOn,
          });
          const bReminderDate = deriveReminderDateKey({
            date: b.importantDate.date,
            notify_days_before: b.importantDate.notifyDaysBefore,
            notify_on: b.importantDate.notifyOn,
          });

          if (aReminderDate && bReminderDate && aReminderDate !== bReminderDate) {
            return aReminderDate.localeCompare(bReminderDate);
          }

          return a.importantDate.date.localeCompare(b.importantDate.date);
        });

      return { reminders };
    },
  );
}

export function registerContactImportantDateRoutes(fastify: AppFastifyInstance): void {
  /**
   * GET /api/contacts/:id/important-dates - Get normalized important dates for a person
   */
  fastify.get(
    "/:id/important-dates",
    {
      schema: {
        description: "Get important dates for a contact.",
        params: uuidParamSchema,
        response: withOkResponse(importantDatesListResponseSchema, "Important dates"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;

      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        throw notFound("Contact not found", "not_found");
      }

      const { data: rows, error: rowsError } = await client
        .from("people_important_dates")
        .select(IMPORTANT_DATE_SELECT)
        .eq("user_id", user.id)
        .eq("person_id", personId)
        .order("created_at", { ascending: true });

      if (rowsError) {
        throw internal("internal_server_error", rowsError.message);
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
    {
      schema: {
        body: importantDatesReplaceBodySchema,
        description: "Replace all important dates for a contact.",
        params: uuidParamSchema,
        response: {
          ...withOkResponse(importantDatesListResponseSchema, "Important dates replaced"),
          ...conflictResponse,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      const { id: personId } = request.params;
      const dates = request.body.dates;
      const { data } = await replaceImportantDates(ctx, personId, dates);
      return { dates: data.dates };
    }),
  );
}
