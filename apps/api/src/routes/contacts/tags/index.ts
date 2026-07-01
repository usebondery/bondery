/**
 * Contact tag management routes
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import type { AppFastifyInstance } from "../../../lib/fastify-types";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { getAuth } from "../../../lib/auth";
import { withOkResponse } from "../../../lib/openapi-route-responses";
import { TAG_SELECT } from "../../../lib/queries";
import { contactTagListResponseSchema, messageResponseSchema } from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";

const contactTagBodySchema = z.object({
  tagId: z.string().min(1),
});

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
    async (request, reply) => {
      const { client } = getAuth(request);
      const { id: personId } = request.params;

      const { data: memberships, error: membershipsError } = await client
        .from("people_tags")
        .select("tag_id")
        .eq("person_id", personId);

      if (membershipsError) {
        return reply.status(500).send({ error: membershipsError.message });
      }

      const tagIds = (memberships || []).map((m: { tag_id: string }) => m.tag_id);

      if (tagIds.length === 0) {
        return { tags: [] };
      }

      const { data: tags, error: tagsError } = await client
        .from("tags")
        .select(TAG_SELECT)
        .in("id", tagIds)
        .order("label", { ascending: true });

      if (tagsError) {
        return reply.status(500).send({ error: tagsError.message });
      }

      return { tags: tags || [] };
    },
  );

  fastify.post(
    "/:id/tags",
    {
      schema: {
        description: "Add a tag to a contact.",
        params: uuidParamSchema,
        body: contactTagBodySchema,
        response: withOkResponse(messageResponseSchema, "Tag added to contact"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;
      const { tagId } = request.body;

      const { error } = await client.from("people_tags").upsert(
        {
          person_id: personId,
          tag_id: tagId,
          user_id: user.id,
        },
        { onConflict: "person_id,tag_id" },
      );

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Tag added to contact" };
    },
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
    async (request, reply) => {
      const { client } = getAuth(request);
      const { id: personId, tagId } = request.params;

      const { error } = await client
        .from("people_tags")
        .delete()
        .eq("person_id", personId)
        .eq("tag_id", tagId);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Tag removed from contact" };
    },
  );
}
