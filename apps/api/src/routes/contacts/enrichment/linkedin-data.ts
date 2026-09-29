/**
 * Contacts — LinkedIn Data Routes
 */

import {
  linkedInDataRequestSchema,
  linkedInDataResponseSchema,
  linkedInDataUpsertResponseSchema,
} from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import {
  getLinkedInData,
  upsertLinkedInWorkHistory,
} from "../../../domains/contacts/enrichment/linkedin-data.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { ENRICH_TIER } from "../../../lib/platform/rate-limit.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

export function registerLinkedInDataRoutes(fastify: AppFastifyInstance): void {
  fastify.post(
    "/:id/linkedin-data",
    {
      config: { rateLimit: ENRICH_TIER },
      schema: {
        body: linkedInDataRequestSchema,
        description: "Upsert scraped LinkedIn work history for a contact.",
        params: uuidParamSchema,
        response: withOkResponse(linkedInDataUpsertResponseSchema, "LinkedIn data upserted"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: linkedInDataRequestSchema, params: uuidParamSchema },
      async (ctx, { body, params }) =>
        upsertLinkedInWorkHistory(ctx, params.id, body.workHistory ?? []),
    ),
  );

  fastify.get(
    "/:id/linkedin-data",
    {
      schema: {
        description: "Get LinkedIn work history and education for a contact.",
        params: uuidParamSchema,
        response: withOkResponse(linkedInDataResponseSchema, "LinkedIn data"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params }) =>
      getLinkedInData(ctx, params.id),
    ),
  );
}
