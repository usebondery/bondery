/**
 * Stripe webhook handler for Fastify.
 *
 * Receives subscription lifecycle events from Stripe and upserts the local
 * `subscriptions` table accordingly. No JWT/session auth is used — Stripe
 * authenticates every request via webhook signature verification.
 *
 * Raw body preservation is required for signature verification.
 */

import { EXAMPLE_WEBHOOK_ACK_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type Stripe from "stripe";
import { z } from "zod";
import { badRequest, internal } from "../../lib/platform/errors/http-errors.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { getStripeClient } from "../../services/billing/stripe.js";
import {
  isStripeWebhookEventProcessed,
  recordStripeWebhookEvent,
} from "../../services/billing/webhook-events.js";
import {
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "../../services/billing/webhook-handlers/invoice.js";
import {
  handleCheckoutSessionCompleted,
  upsertSubscriptionFromStripe,
} from "../../services/billing/webhook-handlers/subscription.js";
import { handleTrialWillEnd } from "../../services/billing/webhook-handlers/trial-ending.js";

const webhookAckResponseSchema = z
  .object({
    received: z.boolean(),
  })
  .meta({ example: EXAMPLE_WEBHOOK_ACK_RESPONSE });

export async function stripeWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Webhooks"];
    }
  });

  fastify.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
    done(null, body);
  });

  fastify.post(
    "/",
    {
      config: { rateLimit: false },
      schema: {
        description: "Receive and process a Stripe billing webhook event.",
        response: withOkResponse(webhookAckResponseSchema, "Webhook acknowledged"),
        summary: "Receive a Stripe webhook",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const secret = fastify.config.BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET;

      if (!secret) {
        request.log.warn(
          "BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET is not configured — rejecting webhook",
        );
        throw internal("webhook_not_configured");
      }

      const rawBody = request.body as Buffer;
      const signature = request.headers["stripe-signature"];

      if (typeof signature !== "string") {
        throw badRequest("Missing Stripe signature", "bad_request");
      }

      let stripe: Stripe;
      try {
        stripe = getStripeClient();
      } catch {
        throw internal("webhook_not_configured");
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      } catch (err) {
        request.log.warn({ err }, "stripe-webhook: invalid signature");
        throw badRequest("Invalid webhook signature", "bad_request");
      }

      if (await isStripeWebhookEventProcessed(event.id)) {
        request.log.info({ eventId: event.id }, "stripe-webhook: duplicate event — skipping");
        return reply.status(200).send({ received: true });
      }

      request.log.info({ type: event.type }, "stripe-webhook: received event");

      try {
        switch (event.type) {
          case "checkout.session.completed":
            await handleCheckoutSessionCompleted(event.data.object, request.log);
            break;
          case "customer.subscription.created":
          case "customer.subscription.updated":
            await upsertSubscriptionFromStripe(event.data.object, request.log, {
              eventType: event.type,
            });
            break;
          case "customer.subscription.deleted":
            await upsertSubscriptionFromStripe(
              {
                ...event.data.object,
                status: "canceled",
              },
              request.log,
              { eventType: event.type },
            );
            break;
          case "invoice.paid":
            await handleInvoicePaid(event.data.object, request.log);
            break;
          case "invoice.payment_failed":
            await handleInvoicePaymentFailed(event.data.object, request.log);
            break;
          case "customer.subscription.trial_will_end":
            await handleTrialWillEnd(event.data.object, request.log);
            break;
          default:
            break;
        }

        await recordStripeWebhookEvent(event.id, event.type);
      } catch (err) {
        request.log.error({ err, type: event.type }, "stripe-webhook: handler failed");
        throw internal("failed_to_process_webhook");
      }

      return reply.status(200).send({ received: true });
    },
  );
}
