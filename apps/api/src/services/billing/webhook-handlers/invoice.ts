import type { FastifyBaseLogger } from "fastify";
import type Stripe from "stripe";
import { getSubscriptionIdFromInvoice } from "../stripe-helpers.js";
import { resetPaymentFailureCount, setPaymentFailureCount } from "../subscription.js";

export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  log?: FastifyBaseLogger,
): Promise<void> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) {
    return;
  }

  const updated = await resetPaymentFailureCount(subscriptionId);
  if (updated === 0) {
    log?.info({ subscriptionId }, "stripe-webhook: invoice paid, no subscription row yet");
    return;
  }
  log?.info({ subscriptionId }, "stripe-webhook: payment failure count reset");
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  log?: FastifyBaseLogger,
): Promise<void> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) {
    return;
  }

  const attemptCount = invoice.attempt_count ?? 1;
  const updated = await setPaymentFailureCount(subscriptionId, attemptCount);
  if (updated === 0) {
    log?.info(
      { attemptCount, subscriptionId },
      "stripe-webhook: payment failed, no subscription row yet",
    );
    return;
  }
  log?.info({ attemptCount, subscriptionId }, "stripe-webhook: payment failure recorded");
}
