/**
 * Subscription Checkout Route
 *
 * POST /api/subscriptions/checkout
 *
 * Creates a Stripe embedded Checkout session for the authenticated user.
 * Returns the client secret for initEmbeddedCheckout on the web client.
 */

import { prisma } from "@bondery/db";
import { WEBAPP_ROUTES } from "@bondery/helpers";
import { conflictResponse } from "@bondery/schemas/http/responses";
import { EXAMPLE_CHECKOUT_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import { conflict, forbidden, internal } from "../../lib/platform/errors/http-errors.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { getStripeClient } from "../../services/billing/stripe.js";

const checkoutResponseSchema = z
  .object({
    clientSecret: z.string(),
  })
  .meta({ example: EXAMPLE_CHECKOUT_RESPONSE });

function isBillingUpgradesEnabled(value: string | undefined): boolean {
  return value === "true";
}

export async function subscriptionCheckoutRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Subscriptions"];
    }
  });

  fastify.post(
    "/",
    {
      schema: {
        description:
          "Create a Stripe embedded Checkout session for upgrade (monthly plan; change billing in Stripe portal).",
        response: {
          ...withOkResponse(checkoutResponseSchema, "Checkout session client secret"),
          ...conflictResponse,
        },
        summary: "Start checkout",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isBillingUpgradesEnabled(fastify.config.BONDERY_PUBLIC_BILLING_UPGRADES_ENABLED)) {
        throw forbidden("Billing upgrades are not enabled", "checkout_not_configured");
      }

      const { user } = getAuth(request);
      const priceId = fastify.config.BONDERY_PUBLIC_STRIPE_PRICE_ID_MONTHLY;

      if (!priceId) {
        request.log.error("Stripe monthly price ID is not configured");
        throw internal("checkout_not_configured");
      }

      const existing = await prisma.subscription.findFirst({
        select: { status: true },
        where: { userId: user.id },
      });

      if (existing?.status === "active" || existing?.status === "canceling") {
        throw conflict("AlreadySubscribed", "conflict");
      }

      const returnUrl = `${fastify.config.BONDERY_PUBLIC_WEBAPP_URL}${WEBAPP_ROUTES.SETTINGS}?checkout=success`;

      try {
        const stripe = getStripeClient();
        const session = await stripe.checkout.sessions.create({
          allow_promotion_codes: true,
          customer_email: user.email ?? undefined,
          line_items: [{ price: priceId, quantity: 1 }],
          metadata: {
            bondery_user_id: user.id,
          },
          mode: "subscription",
          return_url: returnUrl,
          subscription_data: {
            metadata: {
              bondery_user_id: user.id,
            },
            trial_period_days: 15,
          },
          ui_mode: "embedded_page",
        });

        if (!session.client_secret) {
          throw new Error("Stripe checkout session missing client_secret");
        }

        return reply.send({ clientSecret: session.client_secret });
      } catch (err) {
        request.log.error({ err, userId: user.id }, "Failed to create Stripe checkout session");
        throw internal("failed_to_create_checkout_session");
      }
    },
  );
}
