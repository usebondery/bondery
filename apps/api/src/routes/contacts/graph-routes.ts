import { relationshipGraphResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { domainContextFromRequest } from "../../lib/platform/domain-context.js";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { getRelationshipGraph } from "../../services/contacts/queries.js";
import { relationshipGraphQuerySchema } from "./schemas.js";

export function registerContactGraphRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    "/relationship-graph",
    {
      schema: {
        description:
          "People linked by a relationship, and the links between them. Each person includes headline and location. hubs=1 adds company and school circles. groups=1 adds group backgrounds.",
        querystring: relationshipGraphQuerySchema,
        response: withOkResponse(relationshipGraphResponseSchema, "Relationship graph"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      return getRelationshipGraph(ctx, request.query, extractAvatarOptions(request.query));
    },
  );
}
