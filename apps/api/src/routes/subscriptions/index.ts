/**
 * Subscription Status API Route
 * Returns the authenticated user's subscription status for frontend gating.
 *
 * Stripe billing mirror — subscription display fields come from the DB (webhook-maintained).
 * before large refactors in this folder (`checkout`, `portal`, `sync`, webhooks).
 */

import { prisma } from "@bondery/db";
import type { SubscriptionStatus } from "@bondery/schemas";
import { subscriptionStatusSchema } from "@bondery/schemas";
import { EXAMPLE_SUBSCRIPTION_STATUS_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { hasPremiumAccess } from "../../services/billing/entitlements.js";
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

const BILLING_STATUSES: NonNullable<SubscriptionStatus["billingStatus"]>[] = [
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
];

const BILLING_INTERVALS: NonNullable<SubscriptionStatus["recurringInterval"]>[] = ["month", "year"];

function toBillingStatus(value: string | null | undefined): SubscriptionStatus["billingStatus"] {
  return value &&
    BILLING_STATUSES.includes(value as NonNullable<SubscriptionStatus["billingStatus"]>)
    ? (value as SubscriptionStatus["billingStatus"])
    : null;
}

function toBillingInterval(
  value: string | null | undefined,
): SubscriptionStatus["recurringInterval"] {
  return value &&
    BILLING_INTERVALS.includes(value as NonNullable<SubscriptionStatus["recurringInterval"]>)
    ? (value as SubscriptionStatus["recurringInterval"])
    : null;
}

function isBillingUpgradesEnabled(value: string | undefined): boolean {
  return value === "true";
}

export const subscriptionRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Subscriptions"];
    }
  });

  fastify.get(
    "/",
    {
      schema: {
        description: "Get the authenticated user's subscription status and chat quota.",
        response: withOkResponse(subscriptionStatusResponseSchema, "Subscription status"),
        summary: "Fetch your subscription",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { user } = getAuth(request);

      const subscription = await prisma.subscription.findFirst({
        select: {
          billingInterval: true,
          cancelAtPeriodEnd: true,
          currency: true,
          currentPeriodEnd: true,
          paymentFailureCount: true,
          productName: true,
          status: true,
          stripeStatus: true,
          trialEndsAt: true,
          unitAmount: true,
        },
        where: { userId: user.id },
      });

      const premiumAccess = hasPremiumAccess(
        subscription
          ? {
              paymentFailureCount: subscription.paymentFailureCount ?? 0,
              status: subscription.status,
            }
          : null,
      );

      const quota = await checkChatQuota(user.id, premiumAccess);

      const paymentBlocked =
        subscription?.status === "past_due" && (subscription.paymentFailureCount ?? 0) >= 3;

      const status: SubscriptionStatus = {
        aiMessageLimit: quota.plan === "premium" ? PREMIUM_MESSAGE_LIMIT : FREE_MESSAGE_LIMIT,
        aiMessagesUsed: quota.messagesUsed,
        aiMonthlyResetAt: quota.resetAt,
        amount: subscription?.unitAmount ?? null,
        billingStatus: toBillingStatus(subscription?.stripeStatus),
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
        canUseChat: quota.allowed,
        currency: subscription?.currency ?? null,
        currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
        paymentBlocked,
        plan: quota.plan,
        productName: subscription?.productName ?? null,
        recurringInterval: toBillingInterval(subscription?.billingInterval),
        trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
        upgradesEnabled: isBillingUpgradesEnabled(
          fastify.config.BONDERY_PUBLIC_BILLING_UPGRADES_ENABLED,
        ),
      };

      return { data: status, success: true };
    },
  );
};
