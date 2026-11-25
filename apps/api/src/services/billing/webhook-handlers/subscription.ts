import { detachPromise } from "@bondery/helpers/async";
import type { FastifyBaseLogger } from "fastify";
import type Stripe from "stripe";
import {
  captureSubscriptionCancel,
  captureSubscriptionCreate,
} from "../../analytics/billing-events.js";
import { mapStripeStatus } from "../map-status.js";
import { getSubscriptionPeriod, isScheduledToCancel } from "../stripe-helpers.js";
import {
  findUserIdByEmail,
  type SubscriptionMirrorFields,
  storePendingSubscription,
  syncAiQuotaPeriod,
  upsertSubscription,
} from "../subscription.js";

const UUID_PATTERN = /^[0-9a-f-]{36}$/iu;

function customerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer): string {
  return typeof customer === "string" ? customer : customer.id;
}

function customerEmail(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer || typeof customer === "string") {
    return null;
  }
  if ("deleted" in customer && customer.deleted) {
    return null;
  }
  return customer.email ?? null;
}

export function extractMirrorFromStripeSubscription(
  subscription: Stripe.Subscription,
): SubscriptionMirrorFields {
  const [item] = subscription.items.data;
  const price = item?.price;
  const product = price?.product;
  const productName =
    typeof product === "object" && product !== null && "name" in product
      ? (product.name as string | null)
      : null;

  return {
    billingInterval: price?.recurring?.interval ?? null,
    currency: price?.currency ?? null,
    priceId: price?.id ?? null,
    productName,
    stripeStatus: subscription.status,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    unitAmount: price?.unit_amount ?? null,
  };
}

export async function upsertSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  log?: FastifyBaseLogger,
  options?: { eventType?: string },
): Promise<void> {
  const email =
    subscription.metadata["email"] ??
    customerEmail(
      typeof subscription.customer === "string" ? null : (subscription.customer as Stripe.Customer),
    );

  const externalId = subscription.metadata["bondery_user_id"];
  const isValidUuid =
    externalId !== null && externalId !== undefined && UUID_PATTERN.test(externalId);

  let userId: string | null = isValidUuid ? externalId : null;

  if (!userId && email) {
    userId = await findUserIdByEmail(email);
  }

  const stripeCustomerId = customerId(subscription.customer);
  const cancelAtPeriodEnd = isScheduledToCancel(subscription);
  const status = mapStripeStatus(subscription.status, cancelAtPeriodEnd);
  const { currentPeriodEnd, currentPeriodStart } = getSubscriptionPeriod(subscription);
  const mirror = extractMirrorFromStripeSubscription(subscription);

  if (!userId) {
    if (!email) {
      log?.warn(
        { stripeSubscriptionId: subscription.id },
        "stripe-webhook: no user or email — skipping subscription upsert",
      );
      return;
    }

    await storePendingSubscription({
      cancelAtPeriodEnd,
      currentPeriodEnd,
      email,
      status,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
    });
    log?.info(
      { email, stripeSubscriptionId: subscription.id },
      "stripe-webhook: stored pending subscription",
    );
    return;
  }

  const result = await upsertSubscription({
    cancelAtPeriodEnd,
    currentPeriodEnd,
    currentPeriodStart,
    mirror,
    status,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    userId,
  });

  if (result === "user_missing") {
    // The account was deleted. Stripe would retry a failure for days and it could never
    // succeed, so the event is acknowledged. The warning is the record of it.
    log?.warn(
      { stripeSubscriptionId: subscription.id, userId },
      "stripe-webhook: user no longer exists — skipping subscription upsert",
    );
    return;
  }

  // The chat allowance follows the paid period, so its window ends when this one does.
  // A new period end starts a new window; Stripe redelivery passes the same end twice.
  if (currentPeriodEnd) {
    await syncAiQuotaPeriod(userId, currentPeriodEnd, log);
  }

  if (options?.eventType === "customer.subscription.created") {
    detachPromise(captureSubscriptionCreate(userId, subscription, mirror));
  }

  if (options?.eventType === "customer.subscription.deleted") {
    detachPromise(captureSubscriptionCancel(userId, subscription, mirror));
  }

  log?.info(
    { status, stripeSubscriptionId: subscription.id, userId },
    "stripe-webhook: subscription updated",
  );
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  log?: FastifyBaseLogger,
): Promise<void> {
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    log?.info({ sessionId: session.id }, "stripe-webhook: checkout session has no subscription");
    return;
  }

  const { getStripeClient } = await import("../stripe.js");
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionFromStripe(subscription, log);
}
