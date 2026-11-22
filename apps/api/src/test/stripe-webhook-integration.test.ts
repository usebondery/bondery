/**
 * Stripe webhook against real Postgres.
 *
 * Stripe does not order its events and retries any non-2xx for days. An event that can
 * never be processed (no subscription row yet, deleted user, duplicate delivery) must
 * be acknowledged with 200, not answered with `failed_to_process_webhook`.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { generateId } from "@bondery/helpers/ids";
import Stripe from "stripe";
import { loadTestEnv } from "./load-test-env.js";

const WEBHOOK_SECRET = "whsec_stripe_webhook_integration_test";

loadTestEnv();
process.env["BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET"] = WEBHOOK_SECRET;
process.env["BONDERY_PRIVATE_STRIPE_SECRET_KEY"] ??= "sk_test_stripe_webhook_integration_test";

const { createTestApp } = await import("./create-test-app.js");

const stripe = new Stripe("sk_test_signing_only");

describe("stripe webhook", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  const createdUserIds: string[] = [];
  const createdEventIds: string[] = [];
  const createdSubscriptionIds: string[] = [];

  function uniqueId(prefix: string): string {
    return `${prefix}_test_${generateId().replaceAll("-", "")}`;
  }

  async function seedUser(): Promise<string> {
    const userId = generateId();
    await prisma.user.create({
      data: {
        email: `stripe-webhook-${userId}@example.com`,
        emailVerified: true,
        id: userId,
        name: "Stripe Webhook Test",
      },
    });
    createdUserIds.push(userId);
    return userId;
  }

  function subscriptionObject(subscriptionId: string, userId: string) {
    const now = Math.floor(Date.now() / 1000);
    createdSubscriptionIds.push(subscriptionId);
    return {
      cancel_at: null,
      cancel_at_period_end: false,
      customer: "cus_test_webhook",
      id: subscriptionId,
      items: {
        data: [
          {
            current_period_end: now + 30 * 24 * 60 * 60,
            current_period_start: now,
            price: {
              currency: "usd",
              id: "price_test_webhook",
              product: "prod_test_webhook",
              recurring: { interval: "month" },
              unit_amount: 1000,
            },
          },
        ],
      },
      metadata: { bondery_user_id: userId },
      object: "subscription",
      status: "active",
      trial_end: null,
    };
  }

  function invoiceObject(subscriptionId: string, attemptCount = 1) {
    return {
      attempt_count: attemptCount,
      id: uniqueId("in"),
      object: "invoice",
      parent: { subscription_details: { subscription: subscriptionId } },
    };
  }

  /** Signs and posts one event. Pass `eventId` to redeliver the same event. */
  async function deliver(type: string, object: unknown, eventId = uniqueId("evt")) {
    createdEventIds.push(eventId);
    const payload = JSON.stringify({ data: { object }, id: eventId, object: "event", type });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });

    const response = await app.inject({
      headers: { "content-type": "application/json", "stripe-signature": signature },
      method: "POST",
      payload,
      url: API_ROUTES.WEBHOOKS_STRIPE,
    });
    return { eventId, response };
  }

  before(async () => {
    app = await createTestApp();
  });

  after(async () => {
    await prisma.subscription.deleteMany({
      where: { stripeSubscriptionId: { in: createdSubscriptionIds } },
    });
    await prisma.stripeWebhookEvent.deleteMany({ where: { eventId: { in: createdEventIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await app.close();
  });

  it("acknowledges invoice.paid when the subscription row does not exist yet", async () => {
    const { eventId, response } = await deliver("invoice.paid", invoiceObject(uniqueId("sub")));

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json(), { received: true });
    assert.equal(await prisma.stripeWebhookEvent.count({ where: { eventId } }), 1);
  });

  it("acknowledges invoice.payment_failed when the subscription row does not exist yet", async () => {
    const { response } = await deliver("invoice.payment_failed", invoiceObject(uniqueId("sub"), 2));

    assert.equal(response.statusCode, 200, response.body);
  });

  it("acknowledges a redelivered event and records it once", async () => {
    const invoice = invoiceObject(uniqueId("sub"));
    const first = await deliver("invoice.paid", invoice);
    const second = await deliver("invoice.paid", invoice, first.eventId);

    assert.equal(first.response.statusCode, 200, first.response.body);
    assert.equal(second.response.statusCode, 200, second.response.body);
    assert.equal(await prisma.stripeWebhookEvent.count({ where: { eventId: first.eventId } }), 1);
  });

  it("acknowledges a subscription event for a user that no longer exists", async () => {
    const subscriptionId = uniqueId("sub");
    const { response } = await deliver(
      "customer.subscription.updated",
      subscriptionObject(subscriptionId, generateId()),
    );

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(
      await prisma.subscription.count({ where: { stripeSubscriptionId: subscriptionId } }),
      0,
    );
  });

  it("stores one row when two events for a new subscription arrive together", async () => {
    const userId = await seedUser();
    const subscriptionId = uniqueId("sub");
    const subscription = subscriptionObject(subscriptionId, userId);

    const [created, updated] = await Promise.all([
      deliver("customer.subscription.created", subscription),
      deliver("customer.subscription.updated", subscription),
    ]);

    assert.equal(created.response.statusCode, 200, created.response.body);
    assert.equal(updated.response.statusCode, 200, updated.response.body);

    const rows = await prisma.subscription.findMany({ where: { userId } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].stripeSubscriptionId, subscriptionId);
    assert.equal(rows[0].status, "active");
  });

  it("records the payment failure count on an existing subscription", async () => {
    const userId = await seedUser();
    const subscriptionId = uniqueId("sub");
    await deliver("customer.subscription.created", subscriptionObject(subscriptionId, userId));

    const failed = await deliver("invoice.payment_failed", invoiceObject(subscriptionId, 3));
    assert.equal(failed.response.statusCode, 200, failed.response.body);
    assert.equal(
      (await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } }))
        ?.paymentFailureCount,
      3,
    );

    const paid = await deliver("invoice.paid", invoiceObject(subscriptionId));
    assert.equal(paid.response.statusCode, 200, paid.response.body);
    assert.equal(
      (await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } }))
        ?.paymentFailureCount,
      0,
    );
  });

  it("rejects a payload with a bad signature", async () => {
    const response = await app.inject({
      headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=bad" },
      method: "POST",
      payload: JSON.stringify({ id: uniqueId("evt"), type: "invoice.paid" }),
      url: API_ROUTES.WEBHOOKS_STRIPE,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "bad_request");
  });
});
