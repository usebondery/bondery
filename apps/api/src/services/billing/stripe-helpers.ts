import type Stripe from "stripe";

/**
 * Customer Portal period-end cancel in flexible billing mode sets `cancel_at`
 * and leaves `cancel_at_period_end` false.
 * @see https://docs.stripe.com/billing/subscriptions/billing-mode/compare#cancellations-in-the-customer-portal
 */
export function isScheduledToCancel(subscription: {
  cancel_at: number | null;
  cancel_at_period_end: boolean;
}): boolean {
  return subscription.cancel_at_period_end || subscription.cancel_at !== null;
}

export function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
} {
  const [item] = subscription.items.data;
  if (!item) {
    return { currentPeriodEnd: null, currentPeriodStart: null };
  }

  return {
    currentPeriodEnd: new Date(item.current_period_end * 1000),
    currentPeriodStart: new Date(item.current_period_start * 1000),
  };
}

export function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription;
  if (!subscription) {
    return null;
  }
  return typeof subscription === "string" ? subscription : subscription.id;
}
