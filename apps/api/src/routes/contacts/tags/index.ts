/**
 * Contact tag management routes
 */

import {
  contactTagBodySchema,
  contactTagListResponseSchema,
  messageResponseSchema,
  tagResponseSchema,
} from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { domainDb } from "../../../domains/_shared/domain-db.js";
import { addContactTag, removeContactTag } from "../../../domains/contacts/tags.js";
import { domainContextFromRequest } from "../../../lib/platform/domain-context.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { getContactTags } from "../../../services/contacts/queries.js";

const contactTagIdParamsSchema = z.object({
  id: z.string(),
  tagId: z.string(),
});

export function registerTagRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    "/:id/tags",
    {
      schema: {
        description: "List tags assigned to a contact.",
        params: uuidParamSchema,
        response: withOkResponse(contactTagListResponseSchema, "Contact tags"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      return getContactTags(domainDb(ctx), ctx.user.id, request.params.id);
    },
  );

  fastify.post(
    "/:id/tags",
    {
      schema: {
        body: contactTagBodySchema,
        description: "Add a tag to a contact.",
        params: uuidParamSchema,
        response: withOkResponse(tagResponseSchema, "Tag added to contact"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: contactTagBodySchema, params: uuidParamSchema },
      async (ctx, { body, params }) => {
        const { data } = await addContactTag(ctx, params.id, body.tagId);
        return { tag: data.tag };
      },
    ),
  );

  fastify.delete(
    "/:id/tags/:tagId",
    {
      schema: {
        description: "Remove a tag from a contact.",
        params: contactTagIdParamsSchema,
        response: withOkResponse(messageResponseSchema, "Tag removed from contact"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: contactTagIdParamsSchema }, async (ctx, { params }) => {
      await removeContactTag(ctx, params.id, params.tagId);
      return { message: "Tag removed from contact" };
    }),
  );
}
