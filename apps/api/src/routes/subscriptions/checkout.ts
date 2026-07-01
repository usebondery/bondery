/**
 * Subscription Checkout Route
 *
 * POST /api/subscriptions/checkout
 *
 * Creates a short-lived Polar checkout session for the authenticated user.
 * Returns the session URL for PolarEmbedCheckout on the web client.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { getAuth } from "../../lib/auth";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta";
import { withOkResponse } from "../../lib/openapi-route-responses";
import { getPolarClient, sanitizePolarLocale } from "../../lib/polar";

const checkoutResponseSchema = z.object({
  url: z.string(),
});

export async function subscriptionCheckoutRoutes(
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
   * POST / — Create a Polar checkout session for embedded upgrade.
   */
  fastify.post(
    "/",
    {
      schema: {
        description: "Create a Polar checkout session for embedded upgrade.",
        response: withOkResponse(checkoutResponseSchema, "Checkout session URL"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
    const { client, user } = getAuth(request);
    const productId = fastify.config.POLAR_PRODUCT_ID;

    if (!productId) {
      request.log.error("POLAR_PRODUCT_ID is not configured");
      return reply.status(500).send({ error: "Checkout not configured" });
    }

    const { data: existing } = await client
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (existing?.status === "active" || existing?.status === "canceling") {
      return reply.status(409).send({ error: "AlreadySubscribed" });
    }

    const { data: settings } = await client
      .from("user_settings")
      .select("language")
      .eq("user_id", user.id)
      .single();

    try {
      const polar = getPolarClient();
      const session = await polar.checkouts.create({
        products: [productId],
        customerEmail: user.email ?? undefined,
        embedOrigin: fastify.config.NEXT_PUBLIC_WEBAPP_URL,
        externalCustomerId: user.id,
        locale: sanitizePolarLocale(settings?.language ?? null),
      });

      return reply.send({ url: session.url });
    } catch (err) {
      request.log.error({ err, userId: user.id }, "Failed to create Polar checkout session");
      return reply.status(500).send({ error: "Failed to create checkout session" });
    }
  });
}
