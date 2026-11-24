import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SubscriptionStatus } from "@bondery/schemas";

export const SUBSCRIPTION_API_PATH = API_ROUTES.SUBSCRIPTIONS;

export type SubscriptionApiResponse = { data?: SubscriptionStatus | null };

export function parseSubscriptionStatus(raw: SubscriptionApiResponse): SubscriptionStatus | null {
  return raw.data ?? null;
}

/**
 * Whether the usage screen may promise a reset date.
 *
 * A reset is a promise about the future. Two facts make it false: the plan ends at
 * the next renewal, so there is no next period, or the stored reset falls after the
 * period end Stripe last reported. The two lines then contradict each other on one
 * screen, which is what a cancelled plan showed before.
 */
export function canShowUsageReset(
  status: Pick<SubscriptionStatus, "aiMonthlyResetAt" | "cancelAtPeriodEnd" | "currentPeriodEnd">,
): boolean {
  if (status.cancelAtPeriodEnd || !status.aiMonthlyResetAt) {
    return false;
  }
  if (!status.currentPeriodEnd) {
    return true;
  }
  return new Date(status.aiMonthlyResetAt).getTime() <= new Date(status.currentPeriodEnd).getTime();
}
