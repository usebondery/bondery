import { z } from "zod";
import { supportedLocaleSchema } from "#locale/supported-locale/schema.js";
import { nullableDateTimeSchema } from "../_shared/schema.js";
import type {
  AuthUser,
  ColorSchemePreference,
  GroupSortOrderPreference,
  ImportFollowupPlatform,
  ImportFollowupStatus,
  SwipeActionPreference,
  TagSortOrderPreference,
  TimeFormatPreference,
  UpdateAccountInput,
  UpdateImportFollowupBody,
  UpdateSettingsBody,
  UpdateUserSettingsInput,
  UserAccountResponse,
  UserIdentity,
  UserSettings,
  UserSettingsResponse,
} from "./types.js";

export const colorSchemePreferenceSchema: z.ZodType<ColorSchemePreference> = z.enum([
  "light",
  "dark",
  "auto",
]);
export const timeFormatPreferenceSchema: z.ZodType<TimeFormatPreference> = z.enum(["24h", "12h"]);
export const swipeActionPreferenceSchema: z.ZodType<SwipeActionPreference> = z.enum([
  "call",
  "message",
  "email",
]);
export const reminderSendHourSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    error: "Reminder time must be in HH:MM or HH:MM:SS format",
  });
export const groupSortOrderPreferenceSchema: z.ZodType<GroupSortOrderPreference> = z.enum([
  "recent-opened",
  "count-desc",
  "count-asc",
  "alpha-asc",
  "alpha-desc",
]);
export const tagSortOrderPreferenceSchema: z.ZodType<TagSortOrderPreference> = z.enum([
  "count-desc",
  "count-asc",
  "alpha-asc",
  "alpha-desc",
]);

export const importFollowupStatusSchema: z.ZodType<ImportFollowupStatus> = z.enum([
  "awaiting_export",
  "dismissed",
]);
export const importFollowupPlatformSchema: z.ZodType<ImportFollowupPlatform> = z.enum([
  "linkedin",
  "instagram",
]);

export const updateImportFollowupBodySchema: z.ZodType<UpdateImportFollowupBody> = z
  .object({
    platform: importFollowupPlatformSchema.optional(),
    status: importFollowupStatusSchema,
  })
  .superRefine((body, ctx) => {
    if (body.status === "awaiting_export" && !body.platform) {
      ctx.addIssue({
        code: "custom",
        message: "platform is required when status is awaiting_export",
        path: ["platform"],
      });
    }
  });

const mutableUserSettingsInputSchema = z.object({
  colorScheme: colorSchemePreferenceSchema,
  groupSortOrder: groupSortOrderPreferenceSchema,
  language: supportedLocaleSchema.nullable(),
  leftSwipeAction: swipeActionPreferenceSchema,
  reminderSendHour: reminderSendHourSchema,
  rightSwipeAction: swipeActionPreferenceSchema,
  tagSortOrder: tagSortOrderPreferenceSchema,
  timeFormat: timeFormatPreferenceSchema,
  timezone: z.string().nullable(),
});

/** Wire shape for GET /api/me/settings — DB-backed preference fields. */
const mutableUserSettingsSchema = z.object({
  colorScheme: colorSchemePreferenceSchema,
  groupSortOrder: z.string(),
  language: supportedLocaleSchema,
  leftSwipeAction: z.string(),
  reminderSendHour: reminderSendHourSchema,
  rightSwipeAction: z.string(),
  tagSortOrder: z.string(),
  timeFormat: z.string(),
  timezone: z.string().nullable(),
});

/** Wire/API user settings (GET /api/me/settings). */
export const userSettingsSchema = z.object({
  name: z.string().nullable().optional(),
  ...mutableUserSettingsSchema.shape,
  aiMessagesUsed: z.number().optional(),
  avatarUrl: z.string().nullable(),
  gettingStartedDismissedAt: nullableDateTimeSchema.optional(),
  importCompletedAt: nullableDateTimeSchema.optional(),
  importFollowupPlatform: importFollowupPlatformSchema.nullable().optional(),
  importFollowupStatus: importFollowupStatusSchema.nullable().optional(),
  onboardingCompletedAt: nullableDateTimeSchema,
}) satisfies z.ZodType<UserSettings>;

export const updateUserSettingsInputSchema = mutableUserSettingsInputSchema
  .omit({ language: true, timezone: true })
  .extend({
    language: supportedLocaleSchema.optional(),
    timezone: z.string().optional(),
  })
  .partial() satisfies z.ZodType<UpdateUserSettingsInput>;

/** PATCH /api/me/settings body (includes signup-only flag). */
export const updateSettingsBodySchema = updateUserSettingsInputSchema.extend({
  onlyIfNewSignup: z.boolean().optional(),
}) satisfies z.ZodType<UpdateSettingsBody>;

export const userIdentitySchema: z.ZodType<UserIdentity> = z.object({
  id: z.string(),
  identity_id: z.string(),
  provider: z.string(),
  user_id: z.string(),
});

export const userSettingsResponseSchema = z.object({
  data: userSettingsSchema.extend({
    email: z.string().nullable().optional(),
    identities: z.array(userIdentitySchema).optional(),
    providers: z.array(z.string()).optional(),
  }),
  success: z.boolean(),
}) satisfies z.ZodType<UserSettingsResponse>;

export const authUserSchema: z.ZodType<AuthUser> = z.object({
  email: z.string(),
  id: z.string(),
  name: z.string(),
});

export const userAccountResponseSchema: z.ZodType<UserAccountResponse> = z.object({
  data: z.object({
    email: z.string().optional(),
    id: z.string(),
    user_metadata: z
      .object({
        avatar_url: z.string().nullable().optional(),
        middlename: z.string().optional(),
        name: z.string().optional(),
        surname: z.string().optional(),
      })
      .passthrough(),
  }),
  success: z.boolean(),
});

export const updateAccountInputSchema: z.ZodType<UpdateAccountInput> = z.object({
  middlename: z.string().optional(),
  name: z.string().trim().min(1, { error: "First name is required" }).optional(),
  surname: z.string().optional(),
});

/** Alias retained for naming consistency in docs/plans. */
export const updateUserSettingsSchema = updateUserSettingsInputSchema;
