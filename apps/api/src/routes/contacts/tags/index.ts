/**
 * Contact tag management routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../../lib/auth.js";
import { UuidParam, TAG_SELECT } from "../../../lib/schemas.js";

const ContactTagBody = Type.Object({
  tagId: Type.String({ minLength: 1 }),
});

const ContactTagIdParams = Type.Object({
  id: Type.String(),
  tagId: Type.String(),
});

export function registerTagRoutes(fastify: FastifyInstance): void {
  /**
   * GET /api/contacts/:id/tags - Get tags for a contact
   */
  fastify.get(
    "/:id/tags",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
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

      const { data: tagMemberships, error: countsError } = await client
        .from("people_tags")
        .select("tag_id")
        .in("tag_id", tagIds);

      if (countsError) {
        return reply.status(500).send({ error: countsError.message });
      }

      const countMap = new Map<string, number>();
      tagMemberships?.forEach((item: { tag_id: string }) => {
        const current = countMap.get(item.tag_id) || 0;
        countMap.set(item.tag_id, current + 1);
      });

      const tagsWithCounts = (tags || []).map((tag) => ({
        ...tag,
        contactCount: countMap.get(tag.id) || 0,
      }));

      return { tags: tagsWithCounts };
    },
  );

  /**
   * POST /api/contacts/:id/tags - Add a tag to a contact
   */
  fastify.post(
    "/:id/tags",
    { schema: { params: UuidParam, body: ContactTagBody } },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Body: typeof ContactTagBody.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;
      const { tagId } = request.body;

      const { error } = await client
        .from("people_tags")
        .upsert(
          { person_id: personId, tag_id: tagId, user_id: user.id },
          { onConflict: "person_id,tag_id", ignoreDuplicates: true },
        );

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      const { data: tag, error: tagError } = await client
        .from("tags")
        .select(TAG_SELECT)
        .eq("id", tagId)
        .eq("user_id", user.id)
        .single();

      if (tagError || !tag) {
        return reply.status(404).send({ error: "Tag not found" });
      }

      return reply.status(201).send({ tag });
    },
  );

  /**
   * DELETE /api/contacts/:id/tags/:tagId - Remove a tag from a contact
   */
  fastify.delete(
    "/:id/tags/:tagId",
    { schema: { params: ContactTagIdParams } },
    async (
      request: FastifyRequest<{ Params: typeof ContactTagIdParams.static }>,
      reply: FastifyReply,
    ) => {
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

      return { message: "Tag removed from contact successfully" };
    },
  );
}
