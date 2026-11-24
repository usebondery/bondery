/** A past-due subscriber keeps premium access until this many payment attempts have failed. */
export const PAST_DUE_ACCESS_FAILURE_LIMIT = 3;

export type SubscriptionEntitlementInput = {
  paymentFailureCount: number;
  status: string;
};

/**
 * Whether the user should receive premium access (chat quota, gating).
 * Active and canceling subscribers always have access.
 * Past-due subscribers keep access until three failed payment attempts.
 */
export function hasPremiumAccess(subscription: SubscriptionEntitlementInput | null): boolean {
  if (!subscription) {
    return false;
  }

  if (subscription.status === "active" || subscription.status === "canceling") {
    return true;
  }

  if (
    subscription.status === "past_due" &&
    subscription.paymentFailureCount < PAST_DUE_ACCESS_FAILURE_LIMIT
  ) {
    return true;
  }

  return false;
}
