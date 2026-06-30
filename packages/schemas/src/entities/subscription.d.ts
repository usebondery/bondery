import { z } from "zod";
export declare const subscriptionStatusValueSchema: z.ZodEnum<{
    active: "active";
    canceling: "canceling";
    canceled: "canceled";
    revoked: "revoked";
    past_due: "past_due";
}>;
/**
 * Subscription table row shape from API/database.
 * Keep snake_case keys to preserve the current wire contract.
 */
export declare const subscriptionSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    polar_customer_id: z.ZodString;
    polar_subscription_id: z.ZodString;
    status: z.ZodEnum<{
        active: "active";
        canceling: "canceling";
        canceled: "canceled";
        revoked: "revoked";
        past_due: "past_due";
    }>;
    current_period_end: z.ZodNullable<z.ZodString>;
    cancel_at_period_end: z.ZodBoolean;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, z.core.$strip>;
export declare const planTierSchema: z.ZodEnum<{
    free: "free";
    premium: "premium";
}>;
export declare const polarSubscriptionStatusSchema: z.ZodEnum<{
    active: "active";
    canceled: "canceled";
    past_due: "past_due";
    incomplete: "incomplete";
    incomplete_expired: "incomplete_expired";
    trialing: "trialing";
    unpaid: "unpaid";
}>;
export declare const polarRecurringIntervalSchema: z.ZodEnum<{
    year: "year";
    month: "month";
    day: "day";
    week: "week";
}>;
export declare const subscriptionStatusSchema: z.ZodObject<{
    plan: z.ZodEnum<{
        free: "free";
        premium: "premium";
    }>;
    aiMessagesUsed: z.ZodNumber;
    aiMessageLimit: z.ZodNumber;
    aiMonthlyResetAt: z.ZodNullable<z.ZodString>;
    canUseChat: z.ZodBoolean;
    currentPeriodEnd: z.ZodNullable<z.ZodString>;
    cancelAtPeriodEnd: z.ZodBoolean;
    polarStatus: z.ZodNullable<z.ZodEnum<{
        active: "active";
        canceled: "canceled";
        past_due: "past_due";
        incomplete: "incomplete";
        incomplete_expired: "incomplete_expired";
        trialing: "trialing";
        unpaid: "unpaid";
    }>>;
    trialEndsAt: z.ZodNullable<z.ZodString>;
    amount: z.ZodNullable<z.ZodNumber>;
    currency: z.ZodNullable<z.ZodString>;
    productName: z.ZodNullable<z.ZodString>;
    recurringInterval: z.ZodNullable<z.ZodEnum<{
        year: "year";
        month: "month";
        day: "day";
        week: "week";
    }>>;
}, z.core.$strip>;
export type SubscriptionStatusValue = z.infer<typeof subscriptionStatusValueSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type PlanTier = z.infer<typeof planTierSchema>;
export type PolarSubscriptionStatus = z.infer<typeof polarSubscriptionStatusSchema>;
export type PolarRecurringInterval = z.infer<typeof polarRecurringIntervalSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
