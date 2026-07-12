/**
 * Contact tag management routes
 */

import type { Tag } from "@bondery/schemas";
import {
  contactTagBodySchema,
  contactTagListResponseSchema,
  messageResponseSchema,
  tagResponseSchema,
} from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { addContactTag, removeContactTag } from "../../../domains/contacts/tags.js";
import { TAG_SELECT } from "../../../lib/data/select-fragments.js";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import { internal } from "../../../lib/platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

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
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;

      const { data: memberships, error: membershipsError } = await client
        .from("people_tags")
        .select(`tags!inner(${TAG_SELECT})`)
        .eq("person_id", personId)
        .eq("user_id", user.id)
        .order("label", { ascending: true, foreignTable: "tags" });

      if (membershipsError) {
        throw internal("internal_server_error", membershipsError.message);
      }

      const tags = (memberships ?? [])
        .map((membership) => (membership as { tags: Tag | null }).tags)
        .filter((tag): tag is Tag => tag != null);

      return { tags };
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
