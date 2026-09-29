import type { DomainContext } from "../../../domains/_shared/context.js";
import {
  executeGetImportantDates,
  executeGetUpcomingReminders,
  executeUpdateImportantDates,
  getImportantDatesInputSchema,
  getUpcomingRemindersInputSchema,
  updateImportantDatesInputSchema,
} from "../../assistant-tools/important-dates.js";
import { chatTool } from "../chat-tool.js";

export function createImportantDateTools(ctx: DomainContext) {
  return {
    get_important_dates: chatTool(ctx, {
      description: "Get important dates for a contact that belongs to the signed-in user.",
      execute: (args) => executeGetImportantDates(ctx, args),
      inputSchema: getImportantDatesInputSchema,
    }),
    get_upcoming_reminders: chatTool(ctx, {
      description:
        "Get upcoming important-date reminders with notifications configured (next month; at most 25).",
      execute: () => executeGetUpcomingReminders(ctx),
      inputSchema: getUpcomingRemindersInputSchema,
    }),
    update_important_dates: chatTool(ctx, {
      description: "Replace all important dates for a contact you own, including an empty list.",
      execute: (args) => executeUpdateImportantDates(ctx, args),
      inputSchema: updateImportantDatesInputSchema,
    }),
  };
}
