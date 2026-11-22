import { prisma } from "@bondery/db";
import type { FastifyBaseLogger } from "fastify";
import type Stripe from "stripe";
import { sendTrialEndingEmail } from "../../../services/notifications/trial-ending.js";
import {
  findUserIdByEmail,
  getSubscriptionByStripeId,
  markTrialEndingEmailSent,
} from "../subscription.js";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

async function resolveUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    select: { email: true },
    where: { id: userId },
  });
  return user?.email ?? null;
}

export async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  log?: FastifyBaseLogger,
): Promise<void> {
  const existing = await getSubscriptionByStripeId(subscription.id);
  if (existing?.trialEndingEmailSentAt) {
    log?.info(
      { stripeSubscriptionId: subscription.id },
      "stripe-webhook: trial-ending email already sent — skipping",
    );
    return;
  }

  const metadataUserId = subscription.metadata.bondery_user_id;
  const isValidUuid = metadataUserId != null && UUID_PATTERN.test(metadataUserId);

  let userId = isValidUuid ? metadataUserId : (existing?.userId ?? null);
  let email: string | null = null;

  if (userId) {
    email = await resolveUserEmail(userId);
  }

  if (!email) {
    const { getStripeClient } = await import("../stripe.js");
    const stripe = getStripeClient();
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const customer = await stripe.customers.retrieve(customerId);
    if (!("deleted" in customer && customer.deleted)) {
      email = customer.email ?? null;
      if (!userId && email) {
        userId = await findUserIdByEmail(email);
      }
    }
  }

  if (!email) {
    log?.warn(
      { stripeSubscriptionId: subscription.id },
      "stripe-webhook: trial-ending email skipped — no email resolved",
    );
    return;
  }

  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  await sendTrialEndingEmail(
    {
      email,
      trialEndsAt,
      userId,
      userName: null,
    },
    log,
  );

  const marked = await markTrialEndingEmailSent(subscription.id);
  if (marked === 0) {
    // No subscription row to mark, so a redelivery of this event would send the email again.
    log?.warn(
      { stripeSubscriptionId: subscription.id },
      "stripe-webhook: trial-ending email sent but no subscription row to mark",
    );
    return;
  }
  log?.info(
    { email, stripeSubscriptionId: subscription.id },
    "stripe-webhook: trial-ending email sent",
  );
}
