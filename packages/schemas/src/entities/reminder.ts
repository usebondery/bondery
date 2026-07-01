import { z } from "zod";
import { contactPreviewSchema } from "./contact";
import { importantDateSchema, importantDateTypeSchema } from "./important-date";

export const upcomingReminderSchema = z.object({
  importantDate: importantDateSchema,
  person: contactPreviewSchema,
  notificationSent: z.boolean(),
  notificationSentAt: z.string().nullable(),
});

export const reminderDigestItemSchema = z.object({
  personId: z.string(),
  personName: z.string(),
  personAvatar: z.union([z.string(), z.null()]).optional(),
  type: importantDateTypeSchema,
  date: z.string(),
  notifyOn: z.string(),
  notifyDaysBefore: z.union([z.literal(1), z.literal(3), z.literal(7)]),
  note: z.union([z.string(), z.null()]).optional(),
});

export const reminderDigestUserSchema = z.object({
  userId: z.string(),
  email: z.string(),
  timezone: z.string().optional(),
  targetDate: z.string().optional(),
  reminders: z.array(reminderDigestItemSchema),
});

export const reminderDigestRequestSchema = z.object({
  targetDate: z.string(),
  users: z.array(reminderDigestUserSchema),
});

export const reminderDigestResponseSchema = z.object({
  success: z.boolean(),
  targetDate: z.string(),
  sentUsers: z.number(),
  failedUsers: z.number(),
  failures: z
    .array(
      z.object({
        userId: z.string(),
        email: z.string(),
        error: z.string(),
      }),
    )
    .optional(),
});

export const upcomingRemindersResponseSchema = z.object({
  reminders: z.array(upcomingReminderSchema),
});

export type UpcomingReminder = z.infer<typeof upcomingReminderSchema>;
export type UpcomingRemindersResponse = z.infer<typeof upcomingRemindersResponseSchema>;
export type ReminderDigestRequest = z.infer<typeof reminderDigestRequestSchema>;
