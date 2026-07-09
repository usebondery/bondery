/**
 * Subscription Status API Route
 * Returns the authenticated user's subscription status for frontend gating.
 */

import type { SubscriptionStatus } from "@bondery/schemas";
import { subscriptionStatusSchema } from "@bondery/schemas";
import { EXAMPLE_SUBSCRIPTION_STATUS_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { getPolarClient } from "../../services/billing/polar.js";
import {
  checkChatQuota,
  FREE_MESSAGE_LIMIT,
  PREMIUM_MESSAGE_LIMIT,
} from "../../services/chat/quota.js";

const subscriptionStatusResponseSchema = z
  .object({
    data: subscriptionStatusSchema,
    success: z.boolean(),
  })
  .meta({ example: EXAMPLE_SUBSCRIPTION_STATUS_RESPONSE });

const POLAR_STATUSES: SubscriptionStatus["polarStatus"][] = [
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
];

const POLAR_INTERVALS: NonNullable<SubscriptionStatus["recurringInterval"]>[] = [
  "day",
  "week",
  "month",
  "year",
];

function toPolarStatus(value: string | null | undefined): SubscriptionStatus["polarStatus"] {
  return value && POLAR_STATUSES.includes(value as SubscriptionStatus["polarStatus"])
    ? (value as SubscriptionStatus["polarStatus"])
    : null;
}

function toPolarInterval(
  value: string | null | undefined,
): SubscriptionStatus["recurringInterval"] {
  return value &&
    POLAR_INTERVALS.includes(value as NonNullable<SubscriptionStatus["recurringInterval"]>)
    ? (value as SubscriptionStatus["recurringInterval"])
    : null;
}

export const subscriptionRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Subscriptions"];
    }
  });

  /**
   * GET /api/subscriptions - Get current user's subscription status
   */
  fastify.get(
    "/",
    {
      schema: {
        description: "Get the authenticated user's subscription status and chat quota.",
        response: withOkResponse(subscriptionStatusResponseSchema, "Subscription status"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);

      const quota = await checkChatQuota(client, user.id);

      // Fetch subscription details for period info
      const { data: subscription } = await client
        .from("subscriptions")
        .select("current_period_end, cancel_at_period_end, polar_subscription_id")
        .eq("user_id", user.id)
        .single();

      let polarStatus: SubscriptionStatus["polarStatus"] = null;
      let trialEndsAt: string | null = null;
      let amount: number | null = null;
      let currency: string | null = null;
      let productName: string | null = null;
      let recurringInterval: SubscriptionStatus["recurringInterval"] = null;
      let currentPeriodEnd = subscription?.current_period_end ?? null;

      if (subscription?.polar_subscription_id) {
        try {
          const polar = getPolarClient();
          const polarSubscription = await polar.subscriptions.get({
            id: subscription.polar_subscription_id,
          });

          polarStatus = toPolarStatus(polarSubscription.status);
          trialEndsAt = polarSubscription.trialEnd
            ? polarSubscription.trialEnd.toISOString()
            : null;
          amount = polarSubscription.amount ?? null;
          currency = polarSubscription.currency ?? null;
          productName = polarSubscription.product?.name ?? null;
          recurringInterval = toPolarInterval(polarSubscription.recurringInterval);
          currentPeriodEnd = polarSubscription.currentPeriodEnd
            ? polarSubscription.currentPeriodEnd.toISOString()
            : currentPeriodEnd;
        } catch (err) {
          request.log.warn(
            { err, userId: user.id },
            "subscriptions: failed to load Polar subscription details",
          );
        }
      }

      const status: SubscriptionStatus = {
        aiMessageLimit: quota.plan === "premium" ? PREMIUM_MESSAGE_LIMIT : FREE_MESSAGE_LIMIT,
        aiMessagesUsed: quota.messagesUsed,
        aiMonthlyResetAt: quota.resetAt,
        amount,
        cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
        canUseChat: quota.allowed,
        currency,
        currentPeriodEnd,
        plan: quota.plan,
        polarStatus,
        productName,
        recurringInterval,
        trialEndsAt,
      };

      return { data: status, success: true };
    },
  );
};
