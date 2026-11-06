import { bySocialLookupResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { domainContextFromRequest } from "../../lib/platform/domain-context.js";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { findContactBySocial } from "../../services/contacts/queries.js";
import { bySocialQuerySchema } from "./schemas.js";

export function registerContactLookupRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    "/by-social",
    {
      schema: {
        description: "Find a contact by social platform and handle.",
        querystring: bySocialQuerySchema,
        response: withOkResponse(bySocialLookupResponseSchema, "Matching contact"),
        summary: "Find a contact by social handle",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      return findContactBySocial(ctx, request.query);
    },
  );
}
