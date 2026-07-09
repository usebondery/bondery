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

import { EXAMPLE_WEBHOOK_ACK_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { badRequest, internal } from "../../lib/platform/errors/http-errors.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import {
  findUserIdByEmail,
  mapStatus,
  storePendingSubscription,
  upsertSubscription,
} from "../../services/billing/subscription.js";

export { mapStatus, upsertSubscription } from "../../services/billing/subscription.js";

const webhookAckResponseSchema = z
  .object({
    received: z.boolean(),
  })
  .meta({ example: EXAMPLE_WEBHOOK_ACK_RESPONSE });

// ── Route plugin ─────────────────────────────────────────────────────────────

/**
 * Fastify plugin for all `/api/webhooks/polar` routes.
 *
 * Registered without the `verifySession` hook — Polar events are anonymous
 * HTTP POST requests authenticated solely by HMAC signature.
 */
export async function polarWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Webhooks"];
    }
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
  fastify.post(
    "/",
    {
      config: { rateLimit: false },
      schema: {
        description: "Receive and process a Polar subscription lifecycle webhook event.",
        response: withOkResponse(webhookAckResponseSchema, "Webhook acknowledged"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const secret = fastify.config.PRIVATE_POLAR_WEBHOOK_SECRET;

      if (!secret) {
        request.log.warn("PRIVATE_POLAR_WEBHOOK_SECRET is not configured — rejecting webhook");
        throw internal("webhook_not_configured");
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
          throw badRequest("Invalid webhook signature", "bad_request");
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
        request.log.warn(
          { type: event.type },
          "polar-webhook: no customer email in payload — skipping",
        );
        return reply.status(200).send({ received: true });
      }

      const status =
        event.type === "subscription.revoked"
          ? "revoked"
          : mapStatus(sub.status, sub.cancelAtPeriodEnd);

      const currentPeriodStart =
        event.type === "subscription.revoked"
          ? null
          : ((sub as { currentPeriodStart?: Date | null }).currentPeriodStart ?? null);

      const currentPeriodEnd =
        event.type === "subscription.revoked" ? null : (sub.currentPeriodEnd ?? null);

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
          request.log.error({ email, err }, "polar-webhook: user lookup failed");
          throw internal("user_lookup_failed");
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
            { email, type: event.type },
            "polar-webhook: no Bondery user found — stored in pending_subscriptions",
          );
        } catch (err) {
          request.log.error({ email, err }, "polar-webhook: failed to store pending subscription");
          throw internal("internal_server_error", "Failed to store pending subscription");
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
        request.log.error({ err, type: event.type, userId }, "polar-webhook: upsert failed");
        throw internal("failed_to_process_webhook");
      }

      request.log.info({ status, type: event.type, userId }, "polar-webhook: subscription updated");
      return reply.status(200).send({ received: true });
    },
  );
}
