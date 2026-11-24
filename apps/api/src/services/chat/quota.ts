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
import { rpcCheckAndIncrementAiMessages, rpcGetAiQuota } from "../../lib/data/rpc.js";
import { hasPremiumAccess } from "../billing/entitlements.js";

interface QuotaCheckResult {
  allowed: boolean;
  limit: number;
  messagesUsed: number;
  plan: "free" | "premium";
  /** ISO timestamp of the period END — when the monthly counter resets. */
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

/** Monthly AI messages for an account without Premium. Resets each period. */
export const FREE_MESSAGE_LIMIT = 5;

/** Monthly AI message cap for premium subscribers. */
export const PREMIUM_MESSAGE_LIMIT = 300;

/**
 * Atomically checks quota and increments the message counter.
 *
 * Both plans share one monthly counter and one limit check; only the limit
 * differs. The check and the increment run in a single DB statement, so
 * concurrent requests cannot bypass the limit.
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

  const row = await rpcCheckAndIncrementAiMessages(db, user.id, limit);

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
 * Both the usage and the reset instant come from `get_ai_quota`, the same SQL
 * function that gates the chat route. A date computed here instead would drift
 * from the number the chat 403 reports.
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
  const { messagesUsed, resetAt } = await rpcGetAiQuota(db, userId);

  return {
    allowed: messagesUsed < (isPremium ? PREMIUM_MESSAGE_LIMIT : FREE_MESSAGE_LIMIT),
    limit: isPremium ? PREMIUM_MESSAGE_LIMIT : FREE_MESSAGE_LIMIT,
    messagesUsed,
    plan: isPremium ? "premium" : "free",
    resetAt,
  };
}
