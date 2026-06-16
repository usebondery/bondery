/**
 * Chat Quota Enforcement
 * Checks whether a user is allowed to send an AI chat message,
 * and atomically increments the counter in the same DB round-trip.
 *
 * Uses the `check_and_increment_ai_messages` Postgres RPC which combines
 * the gate check and the increment into a single UPDATE…RETURNING, eliminating
 * the TOCTOU race that would exist if check and increment were separate calls.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/types/supabase.types";

/** Number of free AI messages available to unsubscribed users (lifetime). */
export const FREE_MESSAGE_LIMIT = 5;

/** Monthly AI message cap for premium subscribers. */
export const PREMIUM_MESSAGE_LIMIT = 300;

export interface QuotaCheckResult {
  allowed: boolean;
  messagesUsed: number;
  limit: number;
  plan: "free" | "premium";
  /** ISO timestamp of the period END — when the monthly counter resets (premium only). */
  resetAt: string | null;
}

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
 *
 * @param client RLS-scoped Supabase client for the current user
 * @param userId The authenticated user's ID
 */
export async function checkAndIncrementQuota(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<QuotaCheckResult> {
  // Resolve subscription status first — one lightweight SELECT on an indexed column.
  const { data: subscription } = await client
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .single();

  const isPremium =
    subscription?.status === "active" || subscription?.status === "canceling";

  const limit = isPremium ? PREMIUM_MESSAGE_LIMIT : FREE_MESSAGE_LIMIT;

  const { data, error } = await client.rpc(
    "check_and_increment_ai_messages" as never,
    {
      p_user_id: userId,
      p_is_premium: isPremium,
      p_limit: limit,
    } as never,
  );

  if (error) {
    throw new Error(
      `check_and_increment_ai_messages RPC failed: ${error.message}`,
    );
  }

  // RPC returns a single-row result set
  const row = Array.isArray(data)
    ? (
        data as Array<{
          allowed: boolean;
          messages_used: number;
          reset_at: string | null;
        }>
      )[0]
    : null;

  return {
    allowed: row?.allowed ?? false,
    messagesUsed: row?.messages_used ?? limit,
    limit,
    plan: isPremium ? "premium" : "free",
    resetAt: row?.reset_at ?? null,
  };
}

/**
 * Read-only quota check — does NOT increment. Used by GET /api/subscriptions
 * to report current usage to the frontend without consuming a message.
 *
 * @param client RLS-scoped Supabase client for the current user
 * @param userId The authenticated user's ID
 */
export async function checkChatQuota(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<QuotaCheckResult> {
  const { data: subscription } = await client
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .single();

  const isPremium =
    subscription?.status === "active" || subscription?.status === "canceling";

  if (isPremium) {
    const { data: settings } = await client
      .from("user_settings")
      .select("ai_messages_this_month, ai_messages_month_reset_at")
      .eq("user_id", userId)
      .single();

    const rawUsed = settings?.ai_messages_this_month ?? 0;
    const rawResetAt = settings?.ai_messages_month_reset_at ?? null;

    // Lazily treat as 0 if the period has elapsed (RPC will reset on next send).
    const periodExpired =
      rawResetAt != null &&
      Date.now() > new Date(rawResetAt).getTime() + 30 * 24 * 60 * 60 * 1000;

    const messagesUsed = periodExpired ? 0 : rawUsed;
    // Return period END (start + 30 days) so the UI shows when usage resets.
    const resetAt =
      periodExpired || !rawResetAt
        ? null
        : new Date(
            new Date(rawResetAt).getTime() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString();

    return {
      allowed: messagesUsed < PREMIUM_MESSAGE_LIMIT,
      messagesUsed,
      limit: PREMIUM_MESSAGE_LIMIT,
      plan: "premium",
      resetAt,
    };
  }

  const { data: settings } = await client
    .from("user_settings")
    .select("ai_messages_used")
    .eq("user_id", userId)
    .single();

  const messagesUsed = settings?.ai_messages_used ?? 0;

  return {
    allowed: messagesUsed < FREE_MESSAGE_LIMIT,
    messagesUsed,
    limit: FREE_MESSAGE_LIMIT,
    plan: "free",
    resetAt: null,
  };
}
