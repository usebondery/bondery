/**
 * Contacts — Enrich Route
 */

import { apiSuccessResponseSchema, enrichContactRequestSchema } from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { enrichContact } from "../../../domains/contacts/enrichment/enrich.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { ENRICH_TIER } from "../../../lib/platform/rate-limit.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

export function registerEnrichRoutes(fastify: AppFastifyInstance): void {
  fastify.post(
    "/:id/enrich",
    {
      config: { rateLimit: ENRICH_TIER },
      schema: {
        body: enrichContactRequestSchema,
        description: "Update a contact with scraped LinkedIn profile data.",
        params: uuidParamSchema,
        response: withOkResponse(apiSuccessResponseSchema, "Contact enriched"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      return enrichContact(ctx, request.params.id, request.body);
    }),
  );
}
