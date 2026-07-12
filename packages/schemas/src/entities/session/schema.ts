import { z } from "zod";
import { supportedLocaleSchema } from "#locale/supported-locale/schema.js";
import { nullableDateTimeSchema } from "../_shared/schema.js";
import { colorSchemePreferenceSchema, timeFormatPreferenceSchema } from "../settings/schema.js";
import type { UserSessionData, UserSessionResponse } from "./types.js";

/** Wire shape for GET /api/me/session — layout shell + routing inputs only. */
export const userSessionDataSchema = z.object({
  avatarUrl: z.string().nullable(),
  colorScheme: colorSchemePreferenceSchema,
  displayName: z.string(),
  language: supportedLocaleSchema,
  onboardingCompletedAt: nullableDateTimeSchema.nullable(),
  timeFormat: timeFormatPreferenceSchema,
  timezone: z.string(),
}) satisfies z.ZodType<UserSessionData>;

export const userSessionResponseSchema = z.object({
  data: userSessionDataSchema,
  success: z.literal(true),
}) satisfies z.ZodType<UserSessionResponse>;
