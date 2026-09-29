/**
 * Contacts — Important Dates Routes
 * Handles important dates (birthdays, anniversaries, etc.) and upcoming reminders.
 */

import type { ImportantDateType } from "@bondery/schemas";
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
import { extractAvatarOptions } from "../../../lib/data/select-fragments.js";
import { domainContextFromRequest } from "../../../lib/platform/domain-context.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import {
  listContactImportantDates,
  listUpcomingReminders,
} from "../../../services/contacts/queries.js";

export const IMPORTANT_DATE_TYPES = [
  "birthday",
  "anniversary",
  "nameday",
  "graduation",
  "other",
] satisfies ImportantDateType[];

export const IMPORTANT_DATE_NOTIFY_VALUES = [1, 3, 7] as const;

export function isImportantDateType(value: string): value is ImportantDateType {
  return IMPORTANT_DATE_TYPES.includes(value as ImportantDateType);
}

export function isValidImportantDateNotifyDaysBefore(value: number): boolean {
  return (IMPORTANT_DATE_NOTIFY_VALUES as readonly number[]).includes(value);
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
      const ctx = domainContextFromRequest(request);
      return listUpcomingReminders(ctx, extractAvatarOptions(request.query));
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
      const ctx = domainContextFromRequest(request);
      return listContactImportantDates(ctx, request.params.id);
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
    withDomainRoute(
      { body: importantDatesReplaceBodySchema, params: uuidParamSchema },
      async (ctx, { body, params }) => {
        const { data } = await replaceImportantDates(ctx, params.id, body.dates);
        return { dates: data.dates };
      },
    ),
  );
}
