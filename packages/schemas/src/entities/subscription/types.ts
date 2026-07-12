export type SubscriptionStatusValue = "active" | "canceling" | "canceled" | "revoked" | "past_due";

export interface Subscription {
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  currentPeriodEnd: string | null;
  id: string;
  polarCustomerId: string;
  polarSubscriptionId: string;
  status: SubscriptionStatusValue;
  updatedAt: string;
  userId: string;
}

export type PlanTier = "free" | "premium";

export type PolarSubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export type PolarRecurringInterval = "day" | "week" | "month" | "year";

export interface SubscriptionStatus {
  aiMessageLimit: number;
  aiMessagesUsed: number;
  aiMonthlyResetAt: string | null;
  amount: number | null;
  cancelAtPeriodEnd: boolean;
  canUseChat: boolean;
  currency: string | null;
  currentPeriodEnd: string | null;
  plan: PlanTier;
  polarStatus: PolarSubscriptionStatus | null;
  productName: string | null;
  recurringInterval: PolarRecurringInterval | null;
  trialEndsAt: string | null;
}
