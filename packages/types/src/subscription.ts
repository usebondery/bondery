/**
 * Subscription Domain Types
 * Types for Polar.sh payment subscriptions
 */

/** Possible subscription statuses synced from Polar.sh webhooks. */
export type SubscriptionStatusValue =
  | "active"
  | "canceling"
  | "canceled"
  | "revoked"
  | "past_due";

/**
 * A subscription row stored in the database, mapped from Polar.sh webhook events.
 */
export interface Subscription {
  id: string;
  user_id: string;
  polar_customer_id: string;
  polar_subscription_id: string;
  status: SubscriptionStatusValue;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

/** The user's current plan tier. */
export type PlanTier = "free" | "premium";

/** Raw status values returned by Polar for a subscription. */
export type PolarSubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

/** Billing interval values returned by Polar. */
export type PolarRecurringInterval = "day" | "week" | "month" | "year";

/**
 * Lightweight subscription status returned to the frontend for gating features.
 */
export interface SubscriptionStatus {
  plan: PlanTier;
  aiMessagesUsed: number;
  aiMessageLimit: number;
  /** ISO timestamp when the monthly message counter resets (premium only). */
  aiMonthlyResetAt: string | null;
  canUseChat: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  polarStatus: PolarSubscriptionStatus | null;
  trialEndsAt: string | null;
  amount: number | null;
  currency: string | null;
  productName: string | null;
  recurringInterval: PolarRecurringInterval | null;
}
