import { prisma } from "@bondery/db";
import type Stripe from "stripe";
import type { DomainContext } from "../../domains/_shared/context.js";
import { mapStripeStatus } from "./map-status.js";
import { getStripeClient } from "./stripe.js";
import { getSubscriptionPeriod, isScheduledToCancel } from "./stripe-helpers.js";
import { deletePendingSubscription, upsertSubscription } from "./subscription.js";

type SubscriptionSyncResult =
  | { synced: true; source: "pending" | "stripe_api" }
  | { synced: false; reason: string };

function extractMirrorFromStripeSubscription(subscription: Stripe.Subscription) {
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

export type { SubscriptionSyncResult };

export async function syncSubscriptionFromStripe(
  ctx: DomainContext,
): Promise<SubscriptionSyncResult> {
  const { user, log } = ctx;
  const { email } = user;

  if (email) {
    const pending = await prisma.pendingSubscription.findUnique({
      where: { email },
    });

    if (pending) {
      await upsertSubscription(
        user.id,
        pending.stripeCustomerId,
        pending.stripeSubscriptionId,
        pending.status,
        null,
        pending.currentPeriodEnd,
        pending.cancelAtPeriodEnd,
      );

      await deletePendingSubscription(email);

      log?.info(
        { email, userId: user.id },
        "subscription-sync: claimed from pending_subscriptions",
      );
      return { source: "pending", synced: true };
    }
  }

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch {
    log?.warn({ userId: user.id }, "subscription-sync: Stripe not configured");
    return { reason: "stripe_not_configured", synced: false };
  }

  let stripeCustomer: Stripe.Customer | null = null;

  try {
    const search = await stripe.customers.search({
      limit: 1,
      query: `metadata['bondery_user_id']:'${user.id}'`,
    });
    stripeCustomer = search.data[0] ?? null;
  } catch (error) {
    log?.warn({ err: error, userId: user.id }, "subscription-sync: Stripe customer search failed");
  }

  if (!stripeCustomer && email) {
    const listed = await stripe.customers.list({ email, limit: 1 });
    stripeCustomer = listed.data[0] ?? null;
  }

  if (!stripeCustomer) {
    log?.info({ userId: user.id }, "subscription-sync: no Stripe customer found");
    return { reason: "no_stripe_customer", synced: false };
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomer.id,
    limit: 10,
    status: "all",
  });

  const activeSub =
    subscriptions.data.find(
      (s) =>
        s.status === "active" ||
        s.status === "trialing" ||
        (s.status === "canceled" && isScheduledToCancel(s)),
    ) ?? subscriptions.data[0];

  if (!activeSub) {
    log?.info(
      { stripeCustomerId: stripeCustomer.id, userId: user.id },
      "subscription-sync: no active Stripe subscription found",
    );
    return { reason: "no_active_subscription", synced: false };
  }

  const cancelAtPeriodEnd = isScheduledToCancel(activeSub);
  const status = mapStripeStatus(activeSub.status, cancelAtPeriodEnd);
  const { currentPeriodEnd, currentPeriodStart } = getSubscriptionPeriod(activeSub);
  const mirror = extractMirrorFromStripeSubscription(activeSub);

  await upsertSubscription(
    user.id,
    typeof activeSub.customer === "string" ? activeSub.customer : activeSub.customer.id,
    activeSub.id,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    mirror,
  );

  log?.info({ status, userId: user.id }, "subscription-sync: synced from Stripe API");
  return { source: "stripe_api", synced: true };
}
