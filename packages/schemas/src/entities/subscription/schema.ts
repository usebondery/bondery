import { z } from "zod";
import { entityAuditSchema, nullableDateTimeSchema } from "../_shared/schema.js";
import type {
  BillingInterval,
  BillingSubscriptionStatus,
  PlanTier,
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
    cancelAtPeriodEnd: z.boolean().describe("True when the plan cancels at period end"),
    currentPeriodEnd: nullableDateTimeSchema.describe("End of the current billing period"),
    id: z.string().describe("Subscription identifier"),
    status: subscriptionStatusValueSchema.describe("Local subscription status"),
    stripeCustomerId: z.string().describe("Stripe customer identifier"),
    stripeSubscriptionId: z.string().describe("Stripe subscription identifier"),
    userId: z.string().describe("Owner account identifier"),
  })
  .extend(entityAuditSchema.shape);

export const planTierSchema: z.ZodType<PlanTier> = z.enum(["free", "premium"]);

export const billingSubscriptionStatusSchema: z.ZodType<BillingSubscriptionStatus> = z.enum([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);

export const billingIntervalSchema: z.ZodType<BillingInterval> = z.enum(["month", "year"]);

export const subscriptionStatusSchema: z.ZodType<SubscriptionStatus> = z.object({
  aiMessageLimit: z.number().describe("Chat message quota for the current period"),
  aiMessagesUsed: z.number().describe("Chat messages used in the current period"),
  aiMonthlyResetAt: nullableDateTimeSchema.describe("When the chat quota resets"),
  amount: z.number().nullable().describe("Plan price in the smallest currency unit"),
  billingStatus: billingSubscriptionStatusSchema.nullable().describe("Stripe subscription status"),
  cancelAtPeriodEnd: z.boolean().describe("True when the plan cancels at period end"),
  canUseChat: z.boolean().describe("True when the account can send chat messages"),
  currency: z.string().nullable().describe("ISO 4217 currency code"),
  currentPeriodEnd: nullableDateTimeSchema.describe("End of the current billing period"),
  paymentBlocked: z.boolean().describe("True when payment failure blocks paid features"),
  plan: planTierSchema.describe("Current plan tier"),
  productName: z.string().nullable().describe("Display name of the billed product"),
  recurringInterval: billingIntervalSchema.nullable().describe("Billing interval"),
  trialEndsAt: nullableDateTimeSchema.describe("When the trial ends"),
  upgradesEnabled: z.boolean().describe("True when the account can change plan"),
});
