import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  planTierSchema,
  polarRecurringIntervalSchema,
  polarSubscriptionStatusSchema,
  subscriptionSchema,
  subscriptionStatusSchema,
  subscriptionStatusValueSchema,
} from "./schema.js";
import type {
  PlanTier,
  PolarRecurringInterval,
  PolarSubscriptionStatus,
  Subscription,
  SubscriptionStatus,
  SubscriptionStatusValue,
} from "./types.js";

type _SubscriptionStatusValue = Assert<
  IsEqual<SubscriptionStatusValue, z.infer<typeof subscriptionStatusValueSchema>>
>;
type _Subscription = Assert<IsEqual<Subscription, z.infer<typeof subscriptionSchema>>>;
type _PlanTier = Assert<IsEqual<PlanTier, z.infer<typeof planTierSchema>>>;
type _PolarSubscriptionStatus = Assert<
  IsEqual<PolarSubscriptionStatus, z.infer<typeof polarSubscriptionStatusSchema>>
>;
type _PolarRecurringInterval = Assert<
  IsEqual<PolarRecurringInterval, z.infer<typeof polarRecurringIntervalSchema>>
>;
type _SubscriptionStatus = Assert<
  IsEqual<SubscriptionStatus, z.infer<typeof subscriptionStatusSchema>>
>;
