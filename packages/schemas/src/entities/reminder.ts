import { z } from "zod";
import { nullableDateTimeSchema } from "#entities/_shared.js";
import { contactPreviewSchema } from "#entities/contact.js";
import { importantDateSchema, importantDateTypeSchema } from "#entities/important-date.js";

export const upcomingReminderSchema = z.object({
  importantDate: importantDateSchema,
  notificationSent: z.boolean(),
  notificationSentAt: nullableDateTimeSchema,
  person: contactPreviewSchema,
});

export const reminderDigestItemSchema = z.object({
  date: z.string(),
  note: z.union([z.string(), z.null()]).optional(),
  notifyDaysBefore: z.union([z.literal(1), z.literal(3), z.literal(7)]),
  notifyOn: z.string(),
  personAvatar: z.union([z.string(), z.null()]).optional(),
  personId: z.string(),
  personName: z.string(),
  type: importantDateTypeSchema,
});

export const reminderDigestUserSchema = z.object({
  email: z.string(),
  reminders: z.array(reminderDigestItemSchema),
  targetDate: z.string().optional(),
  timezone: z.string().optional(),
  userId: z.string(),
});

export const reminderDigestRequestSchema = z.object({
  targetDate: z.string(),
  users: z.array(reminderDigestUserSchema),
});

export const reminderDigestResponseSchema = z.object({
  failedUsers: z.number(),
  failures: z
    .array(
      z.object({
        email: z.string(),
        error: z.string(),
        userId: z.string(),
      }),
    )
    .optional(),
  sentUsers: z.number(),
  success: z.boolean(),
  targetDate: z.string(),
});

export const upcomingRemindersResponseSchema = z.object({
  reminders: z.array(upcomingReminderSchema),
});

export type UpcomingReminder = z.infer<typeof upcomingReminderSchema>;
export type UpcomingRemindersResponse = z.infer<typeof upcomingRemindersResponseSchema>;
export type ReminderDigestRequest = z.infer<typeof reminderDigestRequestSchema>;
