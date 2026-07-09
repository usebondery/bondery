/**
 * Subscription Checkout Route
 *
 * POST /api/subscriptions/checkout
 *
 * Creates a short-lived Polar checkout session for the authenticated user.
 * Returns the session URL for PolarEmbedCheckout on the web client.
 */

import { conflictResponse } from "@bondery/schemas/http/responses";
import { EXAMPLE_CHECKOUT_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import { conflict, internal } from "../../lib/platform/errors/http-errors.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { getPolarClient, sanitizePolarLocale } from "../../services/billing/polar.js";

const checkoutResponseSchema = z
  .object({
    url: z.string(),
  })
  .meta({ example: EXAMPLE_CHECKOUT_RESPONSE });

export async function subscriptionCheckoutRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Subscriptions"];
    }
  });

  /**
   * POST / — Create a Polar checkout session for embedded upgrade.
   */
  fastify.post(
    "/",
    {
      schema: {
        description: "Create a Polar checkout session for embedded upgrade.",
        response: {
          ...withOkResponse(checkoutResponseSchema, "Checkout session URL"),
          ...conflictResponse,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const productId = fastify.config.POLAR_PRODUCT_ID;

      if (!productId) {
        request.log.error("POLAR_PRODUCT_ID is not configured");
        throw internal("checkout_not_configured");
      }

      const { data: existing } = await client
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .single();

      if (existing?.status === "active" || existing?.status === "canceling") {
        throw conflict("AlreadySubscribed", "conflict");
      }

      const { data: settings } = await client
        .from("user_settings")
        .select("language")
        .eq("user_id", user.id)
        .single();

      try {
        const polar = getPolarClient();
        const session = await polar.checkouts.create({
          customerEmail: user.email ?? undefined,
          embedOrigin: fastify.config.NEXT_PUBLIC_WEBAPP_URL,
          externalCustomerId: user.id,
          locale: sanitizePolarLocale(settings?.language ?? null),
          products: [productId],
        });

        return reply.send({ url: session.url });
      } catch (err) {
        request.log.error({ err, userId: user.id }, "Failed to create Polar checkout session");
        throw internal("failed_to_create_checkout_session");
      }
    },
  );
}
