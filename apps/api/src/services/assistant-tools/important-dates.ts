import { importantDatesReplaceBodySchema } from "@bondery/schemas/http";
import { z } from "zod";
import type { DomainContext } from "../../domains/_shared/context.js";
import { replaceImportantDates } from "../../domains/contacts/important-dates.js";
import {
  listContactImportantDates,
  listUpcomingReminders,
} from "../contacts/queries-important-dates.js";
import { ASSISTANT_COLLECTION_CAP } from "./collection-cap.js";

export const getImportantDatesInputSchema = z.object({
  personId: z.string().uuid(),
});

export const updateImportantDatesInputSchema = importantDatesReplaceBodySchema.extend({
  personId: z.string().uuid(),
});

export const getUpcomingRemindersInputSchema = z.object({});

export async function executeGetImportantDates(
  ctx: DomainContext,
  args: z.infer<typeof getImportantDatesInputSchema>,
) {
  return listContactImportantDates(ctx, args.personId);
}

export async function executeUpdateImportantDates(
  ctx: DomainContext,
  args: z.infer<typeof updateImportantDatesInputSchema>,
) {
  const { data } = await replaceImportantDates(ctx, args.personId, args.dates);
  return { dates: data.dates };
}

export async function executeGetUpcomingReminders(ctx: DomainContext) {
  const { reminders } = await listUpcomingReminders(ctx);
  return { reminders: reminders.slice(0, ASSISTANT_COLLECTION_CAP) };
}
