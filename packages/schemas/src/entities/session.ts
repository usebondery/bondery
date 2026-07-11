import { z } from "zod";
import { nullableDateTimeSchema } from "#entities/_shared.js";
import { colorSchemePreferenceSchema, timeFormatPreferenceSchema } from "#entities/settings.js";
import { supportedLocaleSchema } from "#locale/supported-locale.js";

/** Wire shape for GET /api/me/session — layout shell + routing inputs only. */
export const userSessionDataSchema = z.object({
  avatarUrl: z.string().nullable(),
  colorScheme: colorSchemePreferenceSchema,
  displayName: z.string(),
  language: supportedLocaleSchema,
  onboardingCompletedAt: nullableDateTimeSchema.nullable(),
  timeFormat: timeFormatPreferenceSchema,
  timezone: z.string(),
});

export const userSessionResponseSchema = z
  .object({
    data: userSessionDataSchema,
    success: z.literal(true),
  })
  .meta({
    example: {
      data: {
        avatarUrl: null,
        colorScheme: "auto",
        displayName: "Ada Lovelace",
        language: "en",
        onboardingCompletedAt: "2024-01-15T10:00:00+00:00",
        timeFormat: "24h",
        timezone: "Europe/London",
      },
      success: true,
    },
  });

export type UserSessionData = z.infer<typeof userSessionDataSchema>;
export type UserSessionResponse = z.infer<typeof userSessionResponseSchema>;
