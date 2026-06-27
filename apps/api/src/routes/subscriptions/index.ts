/**
 * Subscription Status API Route
 * Returns the authenticated user's subscription status for frontend gating.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "../../lib/auth.js";
import {
  checkChatQuota,
  FREE_MESSAGE_LIMIT,
  PREMIUM_MESSAGE_LIMIT,
} from "../../lib/chat/quota.js";
import type { SubscriptionStatus } from "@bondery/schemas";
import { getPolarClient } from "../../lib/polar.js";

const POLAR_STATUSES: SubscriptionStatus["polarStatus"][] = [
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
];

const POLAR_INTERVALS: NonNullable<SubscriptionStatus["recurringInterval"]>[] =
  ["day", "week", "month", "year"];

function toPolarStatus(
  value: string | null | undefined,
): SubscriptionStatus["polarStatus"] {
  return value &&
    POLAR_STATUSES.includes(value as SubscriptionStatus["polarStatus"])
    ? (value as SubscriptionStatus["polarStatus"])
    : null;
}

function toPolarInterval(
  value: string | null | undefined,
): SubscriptionStatus["recurringInterval"] {
  return value &&
    POLAR_INTERVALS.includes(
      value as NonNullable<SubscriptionStatus["recurringInterval"]>,
    )
    ? (value as SubscriptionStatus["recurringInterval"])
    : null;
}

export async function subscriptionRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Subscriptions"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * GET /api/subscriptions - Get current user's subscription status
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
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
        recurringInterval = toPolarInterval(
          polarSubscription.recurringInterval,
        );
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
      plan: quota.plan,
      aiMessagesUsed: quota.messagesUsed,
      aiMessageLimit:
        quota.plan === "premium" ? PREMIUM_MESSAGE_LIMIT : FREE_MESSAGE_LIMIT,
      aiMonthlyResetAt: quota.resetAt,
      canUseChat: quota.allowed,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      polarStatus,
      trialEndsAt,
      amount,
      currency,
      productName,
      recurringInterval,
    };

    return { success: true, data: status };
  });
}
