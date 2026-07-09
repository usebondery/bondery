/**
 * Subscription Sync Route
 */

import { EXAMPLE_SUBSCRIPTION_SYNC_SKIPPED_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";
import { syncSubscriptionFromPolar } from "../../services/billing/sync.js";

const subscriptionSyncResponseSchema = z
  .union([
    z.object({
      source: z.enum(["pending", "polar_api"]),
      synced: z.literal(true),
    }),
    z.object({
      reason: z.string(),
      synced: z.literal(false),
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
        description: "Sync subscription state from Polar for the authenticated user.",
        response: withOkResponse(subscriptionSyncResponseSchema, "Subscription sync result"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => syncSubscriptionFromPolar(ctx)),
  );
}
