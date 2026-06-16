/**
 * Polar.sh webhook handler for Fastify.
 *
 * Receives subscription lifecycle events from Polar and upserts the local
 * `subscriptions` table accordingly. No JWT/session auth is used — Polar
 * authenticates every request via HMAC-SHA256 (Standard Webhooks spec) which
 * is verified by `validateEvent` from @polar-sh/sdk.
 *
 * Raw body preservation is required for signature verification.
 * This plugin registers a scoped `application/json` content-type handler that
 * captures the raw bytes so the HMAC check operates on the exact bytes Polar
 * sent — NOT on a re-serialised JSON object.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { createAdminClient } from "../../lib/supabase.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Looks up a Bondery user ID by email using the `get_user_id_by_email` RPC.
 * Returns null if no matching user is found.
 */
async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_user_id_by_email" as never, {
    p_email: email,
  } as never);

  if (error) {
    throw new Error(`get_user_id_by_email RPC failed: ${error.message}`);
  }

  return (data as string | null) ?? null;
}

/**
 * Upserts a subscription row for the given user, keyed on user_id.
 */
export async function upsertSubscription(
  userId: string,
  polarCustomerId: string,
  polarSubscriptionId: string,
  status: string,
  currentPeriodStart: Date | null,
  currentPeriodEnd: Date | null,
  cancelAtPeriodEnd: boolean,
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      polar_customer_id: polarCustomerId,
      polar_subscription_id: polarSubscriptionId,
      status,
      current_period_start: currentPeriodStart ? currentPeriodStart.toISOString() : null,
      current_period_end: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
      cancel_at_period_end: cancelAtPeriodEnd,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }
}

/**
 * Stores a Polar subscription event for a user who doesn't have a Bondery account yet.
 * On sign-up, the sync endpoint claims this row and writes it to `subscriptions`.
 * Rows are kept for 30 days (purge cron should delete where created_at < now() - interval '30 days').
 */
async function storePendingSubscription(
  email: string,
  polarCustomerId: string,
  polarSubscriptionId: string,
  status: string,
  currentPeriodEnd: Date | null,
  cancelAtPeriodEnd: boolean,
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.from("pending_subscriptions" as never).upsert(
    {
      email,
      polar_customer_id: polarCustomerId,
      polar_subscription_id: polarSubscriptionId,
      status,
      current_period_end: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
      cancel_at_period_end: cancelAtPeriodEnd,
    } as never,
    { onConflict: "email" },
  );

  if (error) {
    throw new Error(`Failed to store pending subscription: ${error.message}`);
  }
}

/**
 * Maps a Polar subscription status + cancelAtPeriodEnd flag to our internal
 * status string stored in the `subscriptions` table.
 *
 * "canceling" means: active subscription the user has requested to cancel —
 * still has full access until current_period_end.
 */
export function mapStatus(polarStatus: string, cancelAtPeriodEnd: boolean): string {
  switch (polarStatus) {
    case "active":
      return cancelAtPeriodEnd ? "canceling" : "active";
    case "trialing":
      // Trial users have full access — map to active
      return "active";
    case "canceled":
      return "canceled";
    case "incomplete_expired":
      // Payment window expired before subscription started — treat as canceled
      return "canceled";
    case "past_due":
    case "incomplete":
    case "unpaid":
      // Payment failed or pending — treat as past_due
      return "past_due";
    default:
      return "past_due";
  }
}

// ── Route plugin ─────────────────────────────────────────────────────────────

/**
 * Fastify plugin for all `/api/webhooks/polar` routes.
 *
 * Registered without the `verifySession` hook — Polar events are anonymous
 * HTTP POST requests authenticated solely by HMAC signature.
 */
export async function polarWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Webhooks"] };
  });

  // Capture the raw request body as a Buffer so that `validateEvent` can
  // verify the HMAC against the exact bytes Polar sent. Without this,
  // Fastify would JSON-parse the body first, losing whitespace and key-order
  // information that is part of the signed payload.
  fastify.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
    done(null, body);
  });

  /**
   * POST / — receive and process a Polar webhook event
   */
  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const secret = fastify.config.POLAR_WEBHOOK_SECRET;

    if (!secret) {
      request.log.warn("POLAR_WEBHOOK_SECRET is not configured — rejecting webhook");
      return reply.status(500).send({ error: "Webhook not configured" });
    }

    // validateEvent requires the raw body as a string or Buffer
    const rawBody = request.body as Buffer;
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === "string") {
        headers[key] = value;
      }
    }

    let event: ReturnType<typeof validateEvent>;
    try {
      event = validateEvent(rawBody, headers, secret);
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        request.log.warn({ reason: err.message }, "polar-webhook: invalid signature");
        return reply.status(400).send({ error: "Invalid webhook signature" });
      }
      throw err;
    }

    request.log.info({ type: event.type }, "polar-webhook: received event");

    // Only handle subscription lifecycle events — all others are no-ops
    if (
      event.type !== "subscription.created" &&
      event.type !== "subscription.updated" &&
      event.type !== "subscription.revoked" &&
      event.type !== "subscription.active" &&
      event.type !== "subscription.canceled" &&
      event.type !== "subscription.uncanceled" &&
      event.type !== "subscription.past_due"
    ) {
      return reply.status(200).send({ received: true });
    }

    const sub = event.data;
    const email = sub.customer.email;

    if (!email) {
      request.log.warn({ type: event.type }, "polar-webhook: no customer email in payload — skipping");
      return reply.status(200).send({ received: true });
    }

    const status = event.type === "subscription.revoked"
      ? "revoked"
      : mapStatus(sub.status, sub.cancelAtPeriodEnd);

    const currentPeriodStart = event.type === "subscription.revoked"
      ? null
      : ((sub as { currentPeriodStart?: Date | null }).currentPeriodStart ?? null);

    const currentPeriodEnd = event.type === "subscription.revoked"
      ? null
      : (sub.currentPeriodEnd ?? null);

    // ── Identity resolution ───────────────────────────────────────────────
    // Use externalCustomerId (our user UUID) first — set at checkout creation.
    // Fall back to email lookup for subscriptions created outside the app
    // (e.g., directly in the Polar dashboard).

    const externalId = (sub as { externalCustomerId?: string | null }).externalCustomerId;
    const isValidUuid = externalId != null && /^[0-9a-f-]{36}$/i.test(externalId);

    let userId: string | null = isValidUuid ? externalId : null;

    if (!userId) {
      try {
        userId = await findUserIdByEmail(email);
      } catch (err) {
        request.log.error({ err, email }, "polar-webhook: user lookup failed");
        return reply.status(500).send({ error: "User lookup failed" });
      }
    }

    if (!userId) {
      // No Bondery account yet — store for later claiming on sign-up
      try {
        await storePendingSubscription(
          email,
          sub.customer.id,
          sub.id,
          status,
          currentPeriodEnd,
          sub.cancelAtPeriodEnd,
        );
        request.log.info(
          { type: event.type, email },
          "polar-webhook: no Bondery user found — stored in pending_subscriptions",
        );
      } catch (err) {
        request.log.error({ err, email }, "polar-webhook: failed to store pending subscription");
        return reply.status(500).send({ error: "Failed to store pending subscription" });
      }
      return reply.status(200).send({ received: true });
    }

    try {
      await upsertSubscription(
        userId,
        sub.customer.id,
        sub.id,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        sub.cancelAtPeriodEnd,
      );
    } catch (err) {
      request.log.error({ err, userId, type: event.type }, "polar-webhook: upsert failed");
      return reply.status(500).send({ error: "Failed to process webhook" });
    }

    request.log.info({ userId, status, type: event.type }, "polar-webhook: subscription updated");
    return reply.status(200).send({ received: true });
  });
}

