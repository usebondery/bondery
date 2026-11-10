/**
 * Subscription Sync Route
 */

import { EXAMPLE_SUBSCRIPTION_SYNC_SKIPPED_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";
import { syncSubscriptionFromStripe } from "../../services/billing/sync.js";

const subscriptionSyncResponseSchema = z
  .union([
    z.object({
      source: z.enum(["pending", "stripe_api"]).describe("Where the subscription data came from"),
      synced: z.literal(true).describe("True when the local subscription was updated"),
    }),
    z.object({
      reason: z.string().describe("Why the sync did not run"),
      synced: z.literal(false).describe("False when no subscription update ran"),
    }),
  ])
  .meta({ example: EXAMPLE_SUBSCRIPTION_SYNC_SKIPPED_RESPONSE });

export async function subscriptionSyncRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Subscriptions"];
    }
  });

  fastify.post(
    "/",
    {
      schema: {
        description: "Sync subscription state from Stripe for the authenticated user.",
        response: withOkResponse(subscriptionSyncResponseSchema, "Subscription sync result"),
        summary: "Sync subscription state",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => syncSubscriptionFromStripe(ctx)),
  );
}
