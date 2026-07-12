import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  reminderDigestItemSchema,
  reminderDigestRequestSchema,
  reminderDigestResponseSchema,
  reminderDigestUserSchema,
  upcomingReminderSchema,
  upcomingRemindersResponseSchema,
} from "./schema.js";
import type {
  ReminderDigestItem,
  ReminderDigestRequest,
  ReminderDigestResponse,
  ReminderDigestUser,
  UpcomingReminder,
  UpcomingRemindersResponse,
} from "./types.js";

type _UpcomingReminder = Assert<IsEqual<UpcomingReminder, z.infer<typeof upcomingReminderSchema>>>;
type _ReminderDigestItem = Assert<
  IsEqual<ReminderDigestItem, z.infer<typeof reminderDigestItemSchema>>
>;
type _ReminderDigestUser = Assert<
  IsEqual<ReminderDigestUser, z.infer<typeof reminderDigestUserSchema>>
>;
type _ReminderDigestRequest = Assert<
  IsEqual<ReminderDigestRequest, z.infer<typeof reminderDigestRequestSchema>>
>;
type _ReminderDigestResponse = Assert<
  IsEqual<ReminderDigestResponse, z.infer<typeof reminderDigestResponseSchema>>
>;
type _UpcomingRemindersResponse = Assert<
  IsEqual<UpcomingRemindersResponse, z.infer<typeof upcomingRemindersResponseSchema>>
>;
