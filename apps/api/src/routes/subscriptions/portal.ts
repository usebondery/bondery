/**
 * Subscription Customer Portal Route
 *
 * GET /api/subscriptions/portal
 *
 * Creates a short-lived Stripe billing portal session and redirects the user.
 */

import { prisma } from "@bondery/db";
import { WEBAPP_ROUTES } from "@bondery/helpers";
import { standardErrorResponses } from "@bondery/schemas/http/responses";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type Stripe from "stripe";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import { getStripeClient } from "../../services/billing/stripe.js";

export async function subscriptionPortalRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Subscriptions"];
    }
  });

  fastify.get(
    "/",
    {
      schema: {
        description: "Redirect to the Stripe customer portal for billing management.",
        response: {
          302: {
            description: "Redirect to Stripe customer portal",
          },
          ...standardErrorResponses,
        },
        summary: "Open the billing portal",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { user } = getAuth(request);
      const settingsUrl = `${fastify.config.BONDERY_PUBLIC_WEBAPP_URL}${WEBAPP_ROUTES.SETTINGS}`;

      let stripe: Stripe;
      try {
        stripe = getStripeClient();
      } catch {
        request.log.warn({ userId: user.id }, "subscription-portal: Stripe not configured");
        return reply.redirect(settingsUrl);
      }

      const subscription = await prisma.subscription.findFirst({
        select: { stripeCustomerId: true },
        where: { userId: user.id },
      });

      if (!subscription?.stripeCustomerId) {
        return reply.redirect(settingsUrl);
      }

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: subscription.stripeCustomerId,
          return_url: settingsUrl,
        });
        if (session.url) {
          return reply.redirect(session.url);
        }
      } catch (err) {
        request.log.error(
          { err, userId: user.id },
          "subscription-portal: failed to create billing portal session",
        );
      }

      return reply.redirect(settingsUrl);
    },
  );
}
