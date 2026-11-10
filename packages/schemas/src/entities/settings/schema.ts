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

export const colorSchemePreferenceSchema: z.ZodType<ColorSchemePreference> = z
  .enum(["light", "dark", "auto"])
  .describe("Color scheme preference");
export const timeFormatPreferenceSchema: z.ZodType<TimeFormatPreference> = z
  .enum(["24h", "12h"])
  .describe("Clock format preference");
export const swipeActionPreferenceSchema: z.ZodType<SwipeActionPreference> = z
  .enum(["call", "message", "email"])
  .describe("Swipe action on a contact row");
export const reminderSendHourSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    error: "Reminder time must be in HH:MM or HH:MM:SS format",
  })
  .describe("Local time of day to send reminder emails, as `HH:MM` or `HH:MM:SS`");
export const groupSortOrderPreferenceSchema: z.ZodType<GroupSortOrderPreference> = z
  .enum(["recent-opened", "count-desc", "count-asc", "alpha-asc", "alpha-desc"])
  .describe("Sort order for the groups list");
export const tagSortOrderPreferenceSchema: z.ZodType<TagSortOrderPreference> = z
  .enum(["count-desc", "count-asc", "alpha-asc", "alpha-desc"])
  .describe("Sort order for the tags list");

export const importFollowupStatusSchema: z.ZodType<ImportFollowupStatus> = z
  .enum(["awaiting_export", "dismissed"])
  .describe("Onboarding import follow-up status");
export const importFollowupPlatformSchema: z.ZodType<ImportFollowupPlatform> = z
  .enum(["linkedin", "instagram"])
  .describe("Social platform for the import follow-up");

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

const isoCountryCodeStringSchema = z
  .string()
  .trim()
  .length(2, { error: "Country code must be 2 letters" })
  .regex(/^[A-Za-z]{2}$/, { error: "Country code must be ISO-3166 alpha-2" });

/** Response/OpenAPI wire shape — no transform (Fastify serialization). */
export const isoCountryCodeSchema = isoCountryCodeStringSchema.describe(
  "ISO 3166-1 alpha-2 country code",
);

/** Request body — normalizes to uppercase. */
export const isoCountryCodeInputSchema = isoCountryCodeStringSchema.transform((value) =>
  value.toUpperCase(),
);

const mutableUserSettingsInputSchema = z.object({
  colorScheme: colorSchemePreferenceSchema,
  defaultPhoneCountry: isoCountryCodeInputSchema
    .nullable()
    .describe("ISO 3166-1 alpha-2 default calling-code country"),
  groupSortOrder: groupSortOrderPreferenceSchema,
  language: supportedLocaleSchema.nullable().describe("Bondery UI locale code"),
  leftSwipeAction: swipeActionPreferenceSchema,
  productAnalyticsEnabled: z.boolean().describe("True when product analytics collection is on"),
  reminderSendHour: reminderSendHourSchema,
  rightSwipeAction: swipeActionPreferenceSchema,
  tagSortOrder: tagSortOrderPreferenceSchema,
  timeFormat: timeFormatPreferenceSchema,
  timezone: z.string().nullable().describe("IANA timezone name"),
});

/** Wire shape for GET /api/me/settings — DB-backed preference fields. */
const mutableUserSettingsSchema = z.object({
  colorScheme: colorSchemePreferenceSchema,
  defaultPhoneCountry: isoCountryCodeSchema
    .nullable()
    .describe("ISO 3166-1 alpha-2 default calling-code country"),
  groupSortOrder: z.string().describe("Sort order for the groups list"),
  language: supportedLocaleSchema.describe("Bondery UI locale code"),
  leftSwipeAction: z.string().describe("Swipe action on a contact row, left direction"),
  productAnalyticsEnabled: z.boolean().describe("True when product analytics collection is on"),
  reminderSendHour: reminderSendHourSchema,
  rightSwipeAction: z.string().describe("Swipe action on a contact row, right direction"),
  tagSortOrder: z.string().describe("Sort order for the tags list"),
  timeFormat: z.string().describe("Clock format preference"),
  timezone: z.string().nullable().describe("IANA timezone name"),
});

/** Wire/API user settings (GET /api/me/settings). */
export const userSettingsSchema = z.object({
  name: z.string().nullable().optional().describe("Display name"),
  ...mutableUserSettingsSchema.shape,
  aiMessagesUsed: z
    .number()
    .optional()
    .describe("Chat messages used in the current billing period"),
  avatarUrl: z.string().nullable().describe("Avatar image URL, or null when unset"),
  gettingStartedDismissedAt: nullableDateTimeSchema
    .optional()
    .describe("Time the getting-started checklist was dismissed"),
  importCompletedAt: nullableDateTimeSchema.optional().describe("Time the first import completed"),
  importFollowupPlatform: importFollowupPlatformSchema.nullable().optional(),
  importFollowupStatus: importFollowupStatusSchema.nullable().optional(),
  onboardingCompletedAt: nullableDateTimeSchema.describe("Time onboarding completed"),
  productAnalyticsEnabled: z.boolean().describe("True when product analytics collection is on"),
}) satisfies z.ZodType<UserSettings>;

export const updateUserSettingsInputSchema = mutableUserSettingsInputSchema
  .omit({ defaultPhoneCountry: true, language: true, timezone: true })
  .extend({
    defaultPhoneCountry: isoCountryCodeInputSchema
      .nullable()
      .optional()
      .describe("ISO 3166-1 alpha-2 default calling-code country"),
    language: supportedLocaleSchema.optional().describe("Bondery UI locale code"),
    timezone: z.string().optional().describe("IANA timezone name"),
  })
  .partial() satisfies z.ZodType<UpdateUserSettingsInput>;

/** PATCH /api/me/settings body (includes signup-only flag). */
export const updateSettingsBodySchema = updateUserSettingsInputSchema.extend({
  onlyIfNewSignup: z
    .boolean()
    .optional()
    .describe("True to apply these settings only when the account is new"),
}) satisfies z.ZodType<UpdateSettingsBody>;

export const userIdentitySchema: z.ZodType<UserIdentity> = z.object({
  id: z.string().describe("Identity row identifier"),
  identity_id: z.string().describe("Provider identity identifier"),
  provider: z.string().describe("Auth provider id"),
  user_id: z.string().describe("Owner account identifier"),
});

export const userSettingsResponseSchema = z.object({
  data: userSettingsSchema
    .extend({
      email: z.string().nullable().optional().describe("Account email address"),
      identities: z.array(userIdentitySchema).optional().describe("Linked auth identities"),
      providers: z.array(z.string()).optional().describe("Linked auth provider ids"),
    })
    .describe("User settings"),
  success: z.boolean().describe("True when the operation completed"),
}) satisfies z.ZodType<UserSettingsResponse>;

export const authUserSchema: z.ZodType<AuthUser> = z.object({
  email: z.string().describe("Account email address"),
  id: z.string().describe("Owner account identifier"),
  name: z.string().describe("Display name"),
});

export const userAccountResponseSchema: z.ZodType<UserAccountResponse> = z.object({
  data: z
    .object({
      email: z.string().optional().describe("Account email address"),
      id: z.string().describe("Owner account identifier"),
      user_metadata: z
        .object({
          avatar_url: z.string().nullable().optional().describe("Avatar image URL"),
          middlename: z.string().optional().describe("Middle name"),
          name: z.string().optional().describe("Given name"),
          surname: z.string().optional().describe("Family name"),
        })
        .passthrough()
        .describe("Account profile fields"),
    })
    .describe("Account record"),
  success: z.boolean().describe("True when the operation completed"),
});

export const updateAccountInputSchema: z.ZodType<UpdateAccountInput> = z.object({
  middlename: z.string().optional().describe("Middle name"),
  name: z
    .string()
    .trim()
    .min(1, { error: "First name is required" })
    .optional()
    .describe("Given name"),
  surname: z.string().optional().describe("Family name"),
});

/** Alias retained for naming consistency in docs/plans. */
export const updateUserSettingsSchema = updateUserSettingsInputSchema;
