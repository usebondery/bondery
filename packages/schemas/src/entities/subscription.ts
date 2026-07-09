import { z } from "zod";
import { entityAuditSchema, nullableDateTimeSchema } from "#entities/_shared.js";

export const subscriptionStatusValueSchema = z.enum([
  "active",
  "canceling",
  "canceled",
  "revoked",
  "past_due",
]);

/** Subscription table row shape (internal). */
export const subscriptionSchema = z
  .object({
    cancelAtPeriodEnd: z.boolean(),
    currentPeriodEnd: nullableDateTimeSchema,
    id: z.string(),
    polarCustomerId: z.string(),
    polarSubscriptionId: z.string(),
    status: subscriptionStatusValueSchema,
    userId: z.string(),
  })
  .extend(entityAuditSchema.shape);

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
  aiMessageLimit: z.number(),
  aiMessagesUsed: z.number(),
  aiMonthlyResetAt: nullableDateTimeSchema,
  amount: z.number().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canUseChat: z.boolean(),
  currency: z.string().nullable(),
  currentPeriodEnd: nullableDateTimeSchema,
  plan: planTierSchema,
  polarStatus: polarSubscriptionStatusSchema.nullable(),
  productName: z.string().nullable(),
  recurringInterval: polarRecurringIntervalSchema.nullable(),
  trialEndsAt: nullableDateTimeSchema,
});

export type SubscriptionStatusValue = z.infer<typeof subscriptionStatusValueSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type PlanTier = z.infer<typeof planTierSchema>;
export type PolarSubscriptionStatus = z.infer<typeof polarSubscriptionStatusSchema>;
export type PolarRecurringInterval = z.infer<typeof polarRecurringIntervalSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
