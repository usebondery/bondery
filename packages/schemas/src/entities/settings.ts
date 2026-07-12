import { z } from "zod";
import { nullableDateTimeSchema } from "#entities/_shared.js";
import { supportedLocaleSchema } from "#locale/supported-locale.js";

export const colorSchemePreferenceSchema = z.enum(["light", "dark", "auto"]);
export const timeFormatPreferenceSchema = z.enum(["24h", "12h"]);
export const swipeActionPreferenceSchema = z.enum(["call", "message", "email"]);
export const reminderSendHourSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    error: "Reminder time must be in HH:MM or HH:MM:SS format",
  });
export const groupSortOrderPreferenceSchema = z.enum([
  "recent-opened",
  "count-desc",
  "count-asc",
  "alpha-asc",
  "alpha-desc",
]);
export const tagSortOrderPreferenceSchema = z.enum([
  "count-desc",
  "count-asc",
  "alpha-asc",
  "alpha-desc",
]);

export const importFollowupStatusSchema = z.enum(["awaiting_export", "dismissed"]);
export const importFollowupPlatformSchema = z.enum(["linkedin", "instagram"]);

export const updateImportFollowupBodySchema = z
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
});

export const updateUserSettingsInputSchema = mutableUserSettingsInputSchema
  .omit({ language: true, timezone: true })
  .extend({
    language: supportedLocaleSchema.optional(),
    timezone: z.string().optional(),
  })
  .partial();

/** PATCH /api/me/settings body (includes signup-only flag). */
export const updateSettingsBodySchema = updateUserSettingsInputSchema.extend({
  onlyIfNewSignup: z.boolean().optional(),
});

export const userIdentitySchema = z.object({
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
});

export const authUserSchema = z.object({
  email: z.string(),
  id: z.string(),
  name: z.string(),
});

export const userAccountResponseSchema = z.object({
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

export const updateAccountInputSchema = z.object({
  middlename: z.string().optional(),
  name: z.string().trim().min(1, { error: "First name is required" }).optional(),
  surname: z.string().optional(),
});

/** Alias retained for naming consistency in docs/plans. */
export const updateUserSettingsSchema = updateUserSettingsInputSchema;

export type UpdateSettingsBody = z.infer<typeof updateSettingsBodySchema>;

export type ColorSchemePreference = z.infer<typeof colorSchemePreferenceSchema>;
export type TimeFormatPreference = z.infer<typeof timeFormatPreferenceSchema>;
export type SwipeActionPreference = z.infer<typeof swipeActionPreferenceSchema>;
export type GroupSortOrderPreference = z.infer<typeof groupSortOrderPreferenceSchema>;
export type TagSortOrderPreference = z.infer<typeof tagSortOrderPreferenceSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type UserIdentity = z.infer<typeof userIdentitySchema>;
export type UserSettingsResponse = z.infer<typeof userSettingsResponseSchema>;
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsInputSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type UserAccountResponse = z.infer<typeof userAccountResponseSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountInputSchema>;
export type ImportFollowupStatus = z.infer<typeof importFollowupStatusSchema>;
export type ImportFollowupPlatform = z.infer<typeof importFollowupPlatformSchema>;
export type UpdateImportFollowupBody = z.infer<typeof updateImportFollowupBodySchema>;
