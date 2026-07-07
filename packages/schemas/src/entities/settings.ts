import { z } from "zod";
import { nullableDateTimeSchema } from "#entities/_shared.js";

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
    status: importFollowupStatusSchema,
    platform: importFollowupPlatformSchema.optional(),
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
  timezone: z.string().nullable(),
  reminderSendHour: reminderSendHourSchema,
  timeFormat: timeFormatPreferenceSchema,
  language: z.string().nullable(),
  colorScheme: colorSchemePreferenceSchema,
  leftSwipeAction: swipeActionPreferenceSchema,
  rightSwipeAction: swipeActionPreferenceSchema,
  groupSortOrder: groupSortOrderPreferenceSchema,
  tagSortOrder: tagSortOrderPreferenceSchema,
});

/** Wire shape for GET /api/me/settings — DB columns may be plain strings before narrowing. */
const mutableUserSettingsSchema = z.object({
  timezone: z.string().nullable(),
  reminderSendHour: reminderSendHourSchema,
  timeFormat: z.string(),
  language: z.string().nullable(),
  colorScheme: colorSchemePreferenceSchema,
  leftSwipeAction: z.string(),
  rightSwipeAction: z.string(),
  groupSortOrder: z.string(),
  tagSortOrder: z.string(),
});

/** Wire/API user settings (GET /api/me/settings). */
export const userSettingsSchema = z.object({
  name: z.string().nullable().optional(),
  ...mutableUserSettingsSchema.shape,
  avatarUrl: z.string().nullable(),
  onboardingCompletedAt: nullableDateTimeSchema,
  importFollowupStatus: importFollowupStatusSchema.nullable().optional(),
  importFollowupPlatform: importFollowupPlatformSchema.nullable().optional(),
  importCompletedAt: nullableDateTimeSchema.optional(),
  gettingStartedDismissedAt: nullableDateTimeSchema.optional(),
  aiMessagesUsed: z.number().optional(),
});

export const updateUserSettingsInputSchema = mutableUserSettingsInputSchema
  .omit({ timezone: true, language: true })
  .extend({
    timezone: z.string().optional(),
    language: z.string().optional(),
  })
  .partial()
  ;

/** PATCH /api/me/settings body (includes signup-only flag). */
export const updateSettingsBodySchema = updateUserSettingsInputSchema.extend({
  onlyIfNewSignup: z.boolean().optional(),
});

export const userIdentitySchema = z.object({
  id: z.string(),
  user_id: z.string(),
  identity_id: z.string(),
  provider: z.string(),
});

export const userSettingsResponseSchema = z
  .object({
    success: z.boolean(),
    data: userSettingsSchema.extend({
      email: z.string().nullable().optional(),
      providers: z.array(z.string()).optional(),
      identities: z.array(userIdentitySchema).optional(),
    }),
  })
  ;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

export const userAccountResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.object({
      id: z.string(),
      email: z.string().optional(),
      user_metadata: z
        .object({
          name: z.string().optional(),
          middlename: z.string().optional(),
          surname: z.string().optional(),
          avatar_url: z.string().nullable().optional(),
        })
        .passthrough(),
    }),
  })
  ;

export const updateAccountInputSchema = z.object({
  name: z.string().trim().min(1, { error: "First name is required" }).optional(),
  middlename: z.string().optional(),
  surname: z.string().optional(),
});

/** Alias retained for naming consistency in docs/plans. */
export const updateUserSettingsSchema = updateUserSettingsInputSchema;

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
