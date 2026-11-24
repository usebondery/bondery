import { z } from "zod";
import { supportedLocaleSchema } from "#locale/supported-locale/schema.js";
import { nullableDateTimeSchema } from "../_shared/schema.js";
import {
  colorSchemePreferenceSchema,
  dateFormatPreferenceSchema,
  timeFormatPreferenceSchema,
} from "../settings/schema.js";
import type { UserSessionData, UserSessionResponse } from "./types.js";

/** Wire shape for GET /api/me/session — layout shell + routing inputs only. */
export const userSessionDataSchema = z.object({
  avatarUrl: z.string().nullable().describe("Avatar image URL, or null when unset"),
  colorScheme: colorSchemePreferenceSchema,
  dateFormat: dateFormatPreferenceSchema,
  displayName: z.string().describe("Display name"),
  isPlatformAdmin: z.boolean().describe("True when this account is a platform admin"),
  language: supportedLocaleSchema,
  onboardingCompletedAt: nullableDateTimeSchema.nullable().describe("Time onboarding completed"),
  timeFormat: timeFormatPreferenceSchema,
  timezone: z.string().describe("IANA timezone name"),
}) satisfies z.ZodType<UserSessionData>;

export const userSessionResponseSchema = z.object({
  data: userSessionDataSchema.describe("Session fields for the app shell"),
  success: z.literal(true).describe("True when the session load completed"),
}) satisfies z.ZodType<UserSessionResponse>;
