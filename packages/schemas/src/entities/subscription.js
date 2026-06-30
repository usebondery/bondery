import { z } from "zod";
export const subscriptionStatusValueSchema = z.enum([
    "active",
    "canceling",
    "canceled",
    "revoked",
    "past_due",
]);
/**
 * Subscription table row shape from API/database.
 * Keep snake_case keys to preserve the current wire contract.
 */
export const subscriptionSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    polar_customer_id: z.string(),
    polar_subscription_id: z.string(),
    status: subscriptionStatusValueSchema,
    current_period_end: z.string().nullable(),
    cancel_at_period_end: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
});
export const planTierSchema = z.enum(["free", "premium"]);
export const polarSubscriptionStatusSchema = z.enum([
    "incomplete",
    "incomplete_expired",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
]);
export const polarRecurringIntervalSchema = z.enum(["day", "week", "month", "year"]);
export const subscriptionStatusSchema = z.object({
    plan: planTierSchema,
    aiMessagesUsed: z.number(),
    aiMessageLimit: z.number(),
    aiMonthlyResetAt: z.string().nullable(),
    canUseChat: z.boolean(),
    currentPeriodEnd: z.string().nullable(),
    cancelAtPeriodEnd: z.boolean(),
    polarStatus: polarSubscriptionStatusSchema.nullable(),
    trialEndsAt: z.string().nullable(),
    amount: z.number().nullable(),
    currency: z.string().nullable(),
    productName: z.string().nullable(),
    recurringInterval: polarRecurringIntervalSchema.nullable(),
});
