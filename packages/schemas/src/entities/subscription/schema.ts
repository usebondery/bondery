import { z } from "zod";
import { entityAuditSchema, nullableDateTimeSchema } from "../_shared/schema.js";
import type {
  PlanTier,
  PolarRecurringInterval,
  PolarSubscriptionStatus,
  Subscription,
  SubscriptionStatus,
  SubscriptionStatusValue,
} from "./types.js";

export const subscriptionStatusValueSchema: z.ZodType<SubscriptionStatusValue> = z.enum([
  "active",
  "canceling",
  "canceled",
  "revoked",
  "past_due",
]);

/** Subscription table row shape (internal). */
export const subscriptionSchema: z.ZodType<Subscription> = z
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

export const planTierSchema: z.ZodType<PlanTier> = z.enum(["free", "premium"]);

export const polarSubscriptionStatusSchema: z.ZodType<PolarSubscriptionStatus> = z.enum([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);

export const polarRecurringIntervalSchema: z.ZodType<PolarRecurringInterval> = z.enum([
  "day",
  "week",
  "month",
  "year",
]);

export const subscriptionStatusSchema: z.ZodType<SubscriptionStatus> = z.object({
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
