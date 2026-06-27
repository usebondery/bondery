import { z } from "zod";
import { contactPreviewSchema } from "./contact.js";
import { importantDateSchema } from "./important-date.js";

export const upcomingReminderSchema = z.object({
  importantDate: importantDateSchema,
  person: contactPreviewSchema,
  notificationSent: z.boolean(),
  notificationSentAt: z.string().nullable(),
});

export type UpcomingReminder = z.infer<typeof upcomingReminderSchema>;
