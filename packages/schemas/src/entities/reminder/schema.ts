import { z } from "zod";
import { nullableDateTimeSchema } from "../_shared/schema.js";
import { contactPreviewSchema } from "../contact/schema.js";
import { importantDateSchema, importantDateTypeSchema } from "../important-date/schema.js";
import type {
  ReminderDigestItem,
  ReminderDigestRequest,
  ReminderDigestResponse,
  ReminderDigestUser,
  UpcomingReminder,
  UpcomingRemindersResponse,
} from "./types.js";

export const upcomingReminderSchema = z.object({
  importantDate: importantDateSchema,
  notificationSent: z.boolean(),
  notificationSentAt: nullableDateTimeSchema,
  person: contactPreviewSchema,
}) satisfies z.ZodType<UpcomingReminder>;

export const reminderDigestItemSchema = z.object({
  date: z.string(),
  note: z.union([z.string(), z.null()]).optional(),
  notifyDaysBefore: z.union([z.literal(1), z.literal(3), z.literal(7)]),
  notifyOn: z.string(),
  personAvatar: z.union([z.string(), z.null()]).optional(),
  personId: z.string(),
  personName: z.string(),
  type: importantDateTypeSchema,
}) satisfies z.ZodType<ReminderDigestItem>;

export const reminderDigestUserSchema = z.object({
  email: z.string(),
  reminders: z.array(reminderDigestItemSchema),
  targetDate: z.string().optional(),
  timezone: z.string().optional(),
  userId: z.string(),
}) satisfies z.ZodType<ReminderDigestUser>;

export const reminderDigestRequestSchema = z.object({
  targetDate: z.string(),
  users: z.array(reminderDigestUserSchema),
}) satisfies z.ZodType<ReminderDigestRequest>;

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
}) satisfies z.ZodType<ReminderDigestResponse>;

export const upcomingRemindersResponseSchema = z.object({
  reminders: z.array(upcomingReminderSchema),
}) satisfies z.ZodType<UpcomingRemindersResponse>;
