/**
 * Me Settings API Routes
 * Handles user settings/preferences
 */

import {
  apiSuccessResponseSchema,
  type ImportFollowupPlatform,
  type ImportFollowupStatus,
  supportedLocaleSchema,
  updateSettingsBodySchema,
  userSettingsResponseSchema,
} from "@bondery/schemas";
import { DEFAULT_LOCALE } from "@bondery/schemas/locale/supported-locale";
import { EXAMPLE_SETTINGS_PATCH_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { getMyselfProfile } from "../../../lib/contacts/myself.js";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import { domainContextFromRequest } from "../../../lib/platform/domain-context.js";
import { internal } from "../../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { dismissGettingStarted } from "../../../services/me/onboarding.js";
import {
  ensureDefaultSettings,
  type UserSettingsLanguage,
  updateUserSettings,
} from "../../../services/me/settings.js";

const settingsPatchResponseSchema = z
  .object({
    data: z
      .object({
        colorScheme: z.string().nullable().optional(),
        groupSortOrder: z.string().nullable().optional(),
        language: supportedLocaleSchema.optional(),
        leftSwipeAction: z.string().nullable().optional(),
        reminderSendHour: z.string().nullable().optional(),
        rightSwipeAction: z.string().nullable().optional(),
        tagSortOrder: z.string().nullable().optional(),
        timeFormat: z.string().nullable().optional(),
        timezone: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    skipped: z.boolean().optional(),
    success: z.boolean(),
  })
  .meta({ example: EXAMPLE_SETTINGS_PATCH_RESPONSE });

const DEFAULT_REMINDER_SEND_HOUR = "08:00:00";
const DEFAULT_TIME_FORMAT = "24h" as const;
const DEFAULT_LEFT_SWIPE_ACTION = "message" as const;
const DEFAULT_RIGHT_SWIPE_ACTION = "call" as const;
const DEFAULT_GROUP_SORT_ORDER = "count-desc" as const;
const DEFAULT_TAG_SORT_ORDER = "count-desc" as const;
const _NEW_SIGNUP_WINDOW_MS = 30_000;

function _formatSettingsPatchData(result: {
  timezone?: string | null;
  reminder_send_hour?: string | null;
  time_format?: string | null;
  language?: UserSettingsLanguage | null;
  color_scheme?: string | null;
  left_swipe_action?: string | null;
  right_swipe_action?: string | null;
  group_sort_order?: string | null;
  tag_sort_order?: string | null;
}) {
  return {
    colorScheme: result.color_scheme,
    groupSortOrder: result.group_sort_order,
    language: result.language,
    leftSwipeAction: result.left_swipe_action,
    reminderSendHour: result.reminder_send_hour,
    rightSwipeAction: result.right_swipe_action,
    tagSortOrder: result.tag_sort_order,
    timeFormat: result.time_format,
    timezone: result.timezone,
  };
}

type UserIdentityRow = {
  id: string;
  user_id: string;
  identity_id: string;
  provider: string;
};

function mapUserIdentities(
  identities:
    | Array<{
        id?: string;
        user_id?: string;
        identity_id?: string;
        provider?: string;
      }>
    | null
    | undefined,
): UserIdentityRow[] {
  if (!identities?.length) {
    return [];
  }

  return identities
    .filter(
      (
        identity,
      ): identity is {
        id: string;
        user_id: string;
        identity_id: string;
        provider: string;
      } =>
        typeof identity.id === "string" &&
        typeof identity.user_id === "string" &&
        typeof identity.identity_id === "string" &&
        typeof identity.provider === "string",
    )
    .map((identity) => ({
      id: identity.id,
      identity_id: identity.identity_id,
      provider: identity.provider,
      user_id: identity.user_id,
    }));
}

function _normalizeReminderSendHour(value: string): string {
  const [hourPart, minutePart, secondPart] = value.trim().split(":");
  const normalizedHour = hourPart.padStart(2, "0");
  const normalizedMinute = minutePart.padStart(2, "0");
  const normalizedSecond = (secondPart || "00").padStart(2, "0");

  return `${normalizedHour}:${normalizedMinute}:${normalizedSecond}`;
}

function parseImportFollowupStatus(value: string | null | undefined): ImportFollowupStatus | null {
  if (value === "awaiting_export" || value === "dismissed") {
    return value;
  }

  return null;
}

function parseImportFollowupPlatform(
  value: string | null | undefined,
): ImportFollowupPlatform | null {
  if (value === "linkedin" || value === "instagram") {
    return value;
  }

  return null;
}

export const meSettingsRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  /**
   * GET /api/me/settings - Get user settings
   */
  fastify.get(
    "/",
    {
      schema: {
        description: "Get user settings, profile info, and linked auth providers.",
        response: withOkResponse(userSettingsResponseSchema, "User settings"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);

      try {
        const resolvedSettings = await ensureDefaultSettings(domainContextFromRequest(request));

        const { data: userData } = await client.auth.getUser();

        const { firstName, avatarUrl: resolvedAvatarUrl } = await getMyselfProfile(client, user.id);

        const { data: identitiesData } = await client.auth.getUserIdentities();
        const identities = mapUserIdentities(identitiesData?.identities);

        return {
          data: {
            aiMessagesUsed: resolvedSettings.ai_messages_used ?? 0,
            avatarUrl: resolvedAvatarUrl,
            colorScheme: resolvedSettings.color_scheme,
            email: userData?.user?.email,
            gettingStartedDismissedAt: resolvedSettings.getting_started_dismissed_at ?? null,
            groupSortOrder: resolvedSettings.group_sort_order ?? DEFAULT_GROUP_SORT_ORDER,
            identities,
            importCompletedAt: resolvedSettings.import_completed_at ?? null,
            importFollowupPlatform: parseImportFollowupPlatform(
              resolvedSettings.import_followup_platform,
            ),
            importFollowupStatus: parseImportFollowupStatus(
              resolvedSettings.import_followup_status,
            ),
            language: resolvedSettings.language ?? DEFAULT_LOCALE,
            leftSwipeAction: resolvedSettings.left_swipe_action ?? DEFAULT_LEFT_SWIPE_ACTION,
            name: firstName,
            onboardingCompletedAt: resolvedSettings.onboarding_completed_at ?? null,
            providers: userData?.user?.app_metadata?.providers || [],
            reminderSendHour: resolvedSettings.reminder_send_hour ?? DEFAULT_REMINDER_SEND_HOUR,
            rightSwipeAction: resolvedSettings.right_swipe_action ?? DEFAULT_RIGHT_SWIPE_ACTION,
            tagSortOrder: resolvedSettings.tag_sort_order ?? DEFAULT_TAG_SORT_ORDER,
            timeFormat: resolvedSettings.time_format ?? DEFAULT_TIME_FORMAT,
            timezone: resolvedSettings.timezone,
          },
          success: true,
        };
      } catch (error) {
        request.log.error({ err: error }, "Failed to fetch settings");
        throw internal("settings_fetch_failed", error);
      }
    },
  );

  /**
   * PATCH /api/me/settings - Update user settings
   */
  fastify.patch(
    "/",
    {
      schema: {
        body: updateSettingsBodySchema,
        description: "Update user settings and preferences.",
        response: withOkResponse(settingsPatchResponseSchema, "Updated settings"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => updateUserSettings(ctx, request.body)),
  );

  /**
   * PATCH /api/me/settings/getting-started-dismiss - Dismiss the home getting-started rail
   */
  fastify.patch(
    "/getting-started-dismiss",
    {
      schema: {
        description: "Dismiss the getting-started progress rail on the home page.",
        response: withOkResponse(apiSuccessResponseSchema, "Getting started dismissed"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => dismissGettingStarted(ctx)),
  );
};
