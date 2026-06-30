import { z } from "zod";
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
const mutableUserSettingsSchema = z.object({
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
export const userSettingsSchema = z.object({
    id: z.string().optional(),
    user_id: z.string(),
    name: z.string().nullable().optional(),
    ...mutableUserSettingsSchema.shape,
    avatarUrl: z.string().nullable(),
    onboardingCompletedAt: z.string().nullable(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
});
export const updateUserSettingsInputSchema = mutableUserSettingsSchema
    .omit({ timezone: true, language: true })
    .extend({
    timezone: z.string().optional(),
    language: z.string().optional(),
})
    .partial();
/** Alias retained for naming consistency in docs/plans. */
export const updateUserSettingsSchema = updateUserSettingsInputSchema;
export const userIdentitySchema = z.object({
    id: z.string(),
    user_id: z.string(),
    identity_id: z.string(),
    provider: z.string(),
});
export const userSettingsResponseSchema = z.object({
    success: z.boolean(),
    data: userSettingsSchema.extend({
        email: z.string().optional(),
        providers: z.array(z.string()).optional(),
        identities: z.array(userIdentitySchema).optional(),
    }),
});
export const authUserSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
});
export const userAccountResponseSchema = z.object({
    success: z.boolean(),
    data: z.object({
        id: z.string(),
        email: z.string(),
        user_metadata: z.object({
            name: z.string(),
            middlename: z.string(),
            surname: z.string(),
            avatar_url: z.string().nullable(),
        }),
    }),
});
export const updateAccountInputSchema = z.object({
    name: z.string().trim().min(1, { error: "First name is required" }).optional(),
    middlename: z.string().optional(),
    surname: z.string().optional(),
});
