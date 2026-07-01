/**
 * Subscription Sync Route
 *
 * POST /api/subscriptions/sync
 *
 * Looks up the authenticated user's subscription state from Polar and writes
 * it to the local `subscriptions` table. Handles two cases:
 *
 * 1. User subscribed via the in-app checkout (externalCustomerId = user.id set at
 *    session creation) — fetched by external customer ID.
 * 2. User has a matching row in `pending_subscriptions` (subscribed externally
 *    before signing up to Bondery) — claimed and written to `subscriptions`.
 *
 * Safe to call multiple times — exits early if the user already has an active
 * or canceling subscription row.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { getAuth } from "../../lib/auth";
import { createAdminClient } from "../../lib/supabase";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta";
import { withOkResponse } from "../../lib/openapi-route-responses";
import { getPolarClient } from "../../lib/polar";
import { upsertSubscription, mapStatus } from "../webhooks/polar";

const subscriptionSyncResponseSchema = z.union([
  z.object({
    synced: z.literal(true),
    source: z.enum(["pending", "polar_api"]),
  }),
  z.object({
    synced: z.literal(false),
    reason: z.string(),
  }),
]);

export async function subscriptionSyncRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Subscriptions"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * POST /sync — Sync subscription state from Polar for the authenticated user.
   */
  fastify.post(
    "/",
    {
      schema: {
        description: "Sync subscription state from Polar for the authenticated user.",
        response: withOkResponse(subscriptionSyncResponseSchema, "Subscription sync result"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
    const { client, user } = getAuth(request);

    // Early exit: already has an active or canceling subscription
    const { data: existing } = await client
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (existing?.status === "active" || existing?.status === "canceling") {
      request.log.info(
        { userId: user.id },
        "subscription-sync: already active, skipping",
      );
      return reply
        .status(200)
        .send({ synced: false, reason: "already_active" });
    }

    const admin = createAdminClient();
    const email = user.email;

    // ── Case 1: Check pending_subscriptions (bought before signing up) ──
    if (email) {
      const { data: pending } = (await admin
        .from("pending_subscriptions" as never)
        .select("*")
        .eq("email", email)
        .single()) as unknown as {
        data: {
          polar_customer_id: string;
          polar_subscription_id: string;
          status: string;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
        } | null;
      };

      if (pending) {
        try {
          await upsertSubscription(
            user.id,
            pending.polar_customer_id,
            pending.polar_subscription_id,
            pending.status,
            null,
            pending.current_period_end
              ? new Date(pending.current_period_end)
              : null,
            pending.cancel_at_period_end,
          );

          // Remove the claimed pending row
          await admin
            .from("pending_subscriptions" as never)
            .delete()
            .eq("email", email as never);

          request.log.info(
            { userId: user.id, email },
            "subscription-sync: claimed from pending_subscriptions",
          );
          return reply.status(200).send({ synced: true, source: "pending" });
        } catch (err) {
          request.log.error(
            { err, userId: user.id },
            "subscription-sync: failed to claim pending",
          );
          return reply
            .status(503)
            .send({ error: "Failed to sync subscription" });
        }
      }
    }

    // ── Case 2: Look up by externalCustomerId in Polar ──
    let polar;
    try {
      polar = getPolarClient();
    } catch {
      request.log.warn(
        { userId: user.id },
        "subscription-sync: Polar not configured",
      );
      return reply
        .status(200)
        .send({ synced: false, reason: "polar_not_configured" });
    }

    try {
      let polarCustomer;
      try {
        polarCustomer = await polar.customers.getExternal({
          externalId: user.id,
        });
      } catch {
        // Customer doesn't exist in Polar — free tier user
        request.log.info(
          { userId: user.id },
          "subscription-sync: no Polar customer found",
        );
        return reply
          .status(200)
          .send({ synced: false, reason: "no_polar_customer" });
      }

      // Find the most recent active or canceling subscription for this customer
      const subscriptions = await polar.subscriptions.list({
        customerId: polarCustomer.id,
      });

      // Find the most recent subscription that is active or would still provide access
      const activeSub =
        subscriptions.result.items.find(
          (s) =>
            s.status === "active" ||
            (s.status === "canceled" && s.cancelAtPeriodEnd),
        ) ?? subscriptions.result.items[0];

      if (!activeSub) {
        request.log.info(
          { userId: user.id, polarCustomerId: polarCustomer.id },
          "subscription-sync: no active Polar subscription found",
        );
        return reply
          .status(200)
          .send({ synced: false, reason: "no_active_subscription" });
      }

      const status = mapStatus(activeSub.status, activeSub.cancelAtPeriodEnd);
      const currentPeriodStart =
        (activeSub as { currentPeriodStart?: Date | null })
          .currentPeriodStart ?? null;
      const currentPeriodEnd = activeSub.currentPeriodEnd ?? null;

      await upsertSubscription(
        user.id,
        polarCustomer.id,
        activeSub.id,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        activeSub.cancelAtPeriodEnd,
      );

      request.log.info(
        { userId: user.id, status },
        "subscription-sync: synced from Polar API",
      );
      return reply.status(200).send({ synced: true, source: "polar_api" });
    } catch (err) {
      request.log.error(
        { err, userId: user.id },
        "subscription-sync: Polar API error",
      );
      return reply
        .status(503)
        .send({ error: "Failed to sync subscription from Polar" });
    }
  });
}
