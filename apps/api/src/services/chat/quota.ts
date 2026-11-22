/**
 * Chat Quota Enforcement
 * Checks whether a user is allowed to send an AI chat message,
 * and atomically increments the counter in the same DB round-trip.
 *
 * Uses the `check_and_increment_ai_messages` Postgres RPC which combines
 * the gate check and the increment into a single UPDATE…RETURNING, eliminating
 * the TOCTOU race that would exist if check and increment were separate calls.
 */

import { prisma } from "@bondery/db";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { rpcCheckAndIncrementAiMessages } from "../../lib/data/rpc.js";
import { hasPremiumAccess } from "../billing/entitlements.js";

interface QuotaCheckResult {
  allowed: boolean;
  limit: number;
  messagesUsed: number;
  plan: "free" | "premium";
  /** ISO timestamp of the period END — when the monthly counter resets (premium only). */
  resetAt: string | null;
}

async function resolvePremiumAccess(
  db: ReturnType<typeof domainDb>,
  userId: string,
  isPremiumOverride?: boolean,
): Promise<boolean> {
  if (isPremiumOverride !== undefined) {
    return isPremiumOverride;
  }

  const subscription = await db.subscription.findFirst({
    select: { paymentFailureCount: true, status: true },
    where: { userId },
  });

  return hasPremiumAccess(
    subscription
      ? {
          paymentFailureCount: subscription.paymentFailureCount ?? 0,
          status: subscription.status,
        }
      : null,
  );
}

export type { QuotaCheckResult };

/** Number of free AI messages available to unsubscribed users (lifetime). */
export const FREE_MESSAGE_LIMIT = 5;

/** Monthly AI message cap for premium subscribers. */
export const PREMIUM_MESSAGE_LIMIT = 300;

/**
 * Atomically checks quota and increments the message counter.
 *
 * For premium users the monthly counter is used; for free users the lifetime
 * counter is used. Both happen in a single atomic DB UPDATE to prevent
 * concurrent requests from bypassing the limit.
 *
 * IMPORTANT: Because this increments unconditionally, the caller MUST check
 * `result.allowed` and abort streaming if false. The increment is not rolled
 * back — over-limit attempts are counted but blocked.
 */
export async function checkAndIncrementQuota(ctx: DomainContext): Promise<QuotaCheckResult> {
  const db = domainDb(ctx);
  const { user } = ctx;

  const isPremium = await resolvePremiumAccess(db, user.id);
  const limit = isPremium ? PREMIUM_MESSAGE_LIMIT : FREE_MESSAGE_LIMIT;

  const row = await rpcCheckAndIncrementAiMessages(db, user.id, limit, isPremium);

  return {
    allowed: row.allowed,
    limit,
    messagesUsed: row.messagesUsed,
    plan: isPremium ? "premium" : "free",
    resetAt: row.resetAt ?? null,
  };
}

/**
 * Read-only quota check — does NOT increment. Used by GET /api/subscriptions
 * to report current usage to the frontend without consuming a message.
 *
 * @param _client Unused legacy parameter — kept for route signature compatibility.
 * @param userId The authenticated user's ID
 */
export async function checkChatQuota(
  userId: string,
  isPremiumOverride?: boolean,
): Promise<QuotaCheckResult> {
  const db = prisma;
  const isPremium = await resolvePremiumAccess(db, userId, isPremiumOverride);

  if (isPremium) {
    const settings = await db.userSettings.findUnique({
      select: {
        aiMessagesMonthResetAt: true,
        aiMessagesThisMonth: true,
      },
      where: { userId },
    });

    const rawUsed = settings?.aiMessagesThisMonth ?? 0;
    const rawResetAt = settings?.aiMessagesMonthResetAt ?? null;

    const periodExpired =
      rawResetAt !== null && Date.now() > rawResetAt.getTime() + 30 * 24 * 60 * 60 * 1000;

    const messagesUsed = periodExpired ? 0 : rawUsed;
    const resetAt =
      periodExpired || !rawResetAt
        ? null
        : new Date(rawResetAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return {
      allowed: messagesUsed < PREMIUM_MESSAGE_LIMIT,
      limit: PREMIUM_MESSAGE_LIMIT,
      messagesUsed,
      plan: "premium",
      resetAt,
    };
  }

  const settings = await db.userSettings.findUnique({
    select: { aiMessagesUsed: true },
    where: { userId },
  });

  const messagesUsed = settings?.aiMessagesUsed ?? 0;

  return {
    allowed: messagesUsed < FREE_MESSAGE_LIMIT,
    limit: FREE_MESSAGE_LIMIT,
    messagesUsed,
    plan: "free",
    resetAt: null,
  };
}
