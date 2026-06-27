/**
 * Subscription Customer Portal Route
 *
 * GET /api/subscriptions/portal
 *
 * Creates a short-lived Polar customer portal session and redirects the user.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { WEBAPP_ROUTES } from "@bondery/helpers";
import { getAuth } from "../../lib/auth.js";
import { getPolarClient } from "../../lib/polar.js";

export async function subscriptionPortalRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Subscriptions"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * GET / — Redirect to the Polar customer portal for billing management.
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const { client, user } = getAuth(request);
    const settingsUrl = `${fastify.config.NEXT_PUBLIC_WEBAPP_URL}${WEBAPP_ROUTES.SETTINGS}`;

    let polar;
    try {
      polar = getPolarClient();
    } catch {
      request.log.warn({ userId: user.id }, "subscription-portal: Polar not configured");
      return reply.redirect(settingsUrl);
    }

    try {
      const session = await polar.customerSessions.create({
        externalCustomerId: user.id,
        returnUrl: settingsUrl,
      });
      if (session.customerPortalUrl) {
        return reply.redirect(session.customerPortalUrl);
      }
    } catch (err) {
      request.log.warn(
        { err, userId: user.id },
        "subscription-portal: externalCustomerId lookup failed, trying polar_customer_id",
      );
    }

    const { data: subscription } = await client
      .from("subscriptions")
      .select("polar_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!subscription?.polar_customer_id) {
      return reply.redirect(settingsUrl);
    }

    try {
      const session = await polar.customerSessions.create({
        customerId: subscription.polar_customer_id,
        returnUrl: settingsUrl,
      });
      if (session.customerPortalUrl) {
        return reply.redirect(session.customerPortalUrl);
      }
    } catch (err) {
      request.log.error(
        { err, userId: user.id },
        "subscription-portal: failed to create customer session",
      );
    }

    return reply.redirect(settingsUrl);
  });
}
