/**
 * Tags API Routes
 * Handles CRUD operations for tags and tag memberships on contacts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../lib/auth.js";
import { buildContactAvatarUrl } from "../../lib/supabase.js";
import {
  UuidParam,
  IdsBody,
  TAG_SELECT,
  AvatarQualityEnum,
  AvatarSizeEnum,
  extractAvatarOptions,
} from "../../lib/schemas.js";
import type { Tag, TagWithCount, ContactPreview } from "@bondery/types";

// ── TypeBox Schemas ──────────────────────────────────────────────────────────

const TagsQuery = Type.Object({
  previewLimit: Type.Optional(Type.String()),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

const CreateTagBody = Type.Object({
  label: Type.String({ minLength: 1 }),
});

const UpdateTagBody = Type.Object({
  label: Type.Optional(Type.String({ minLength: 1 })),
  color: Type.Optional(Type.String()),
});

const TagMembershipBody = Type.Object({
  personIds: Type.Array(Type.String(), { minItems: 1 }),
});

// Fixed color palette for auto-assigning tag colors
const TAG_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
  "#6366F1", // indigo
  "#84CC16", // lime
];

/**
 * Selects the next color from the palette by cycling through them
 * based on the current count of tags the user already has.
 */
async function pickNextColor(client: any, userId: string): Promise<string> {
  const { count } = await client
    .from("tags")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return TAG_COLORS[(count || 0) % TAG_COLORS.length];
}

export async function tagRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Tags"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * GET /api/tags - List all tags with contact counts and preview contacts
   */
  fastify.get(
    "/",
    { schema: { querystring: TagsQuery } },
    async (
      request: FastifyRequest<{ Querystring: typeof TagsQuery.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);

      const previewLimitRaw = request.query?.previewLimit;
      const previewLimit = previewLimitRaw ? Number(previewLimitRaw) : 3;
      const includePreview = previewLimit > 0;
      const avatarOptions = extractAvatarOptions(request.query);

      // Get all tags
      const { data: tags, error: tagsError } = await client
        .from("tags")
        .select(TAG_SELECT)
        .order("label", { ascending: true });

      if (tagsError) {
        return reply.status(500).send({ error: tagsError.message });
      }

      // Get memberships for counts and previews
      const { data: memberships, error: countsError } = await client
        .from("people_tags")
        .select("tag_id, person_id");

      if (countsError) {
        return reply.status(500).send({ error: countsError.message });
      }

      const countMap = new Map<string, number>();
      const previewMap = new Map<string, string[]>();

      memberships?.forEach((item: { tag_id: string; person_id: string }) => {
        const current = countMap.get(item.tag_id) || 0;
        countMap.set(item.tag_id, current + 1);

        if (!includePreview) return;
        const existing = previewMap.get(item.tag_id) || [];
        if (existing.length < previewLimit) {
          existing.push(item.person_id);
          previewMap.set(item.tag_id, existing);
        }
      });

      let previewContactsById = new Map<string, ContactPreview>();

      if (includePreview) {
        const previewIds = Array.from(new Set(Array.from(previewMap.values()).flat()));

        if (previewIds.length > 0) {
          const { data: previewContacts, error: previewError } = await client
            .from("people")
            .select(`id, firstName:first_name, lastName:last_name, updatedAt:updated_at`)
            .in("id", previewIds)
            .eq("myself", false);

          if (previewError) {
            return reply.status(500).send({ error: previewError.message });
          }

          previewContactsById = new Map(
            (previewContacts || []).map((contact) => [
              contact.id,
              {
                ...contact,
                avatar: buildContactAvatarUrl(
                  client,
                  user.id,
                  contact.id,
                  avatarOptions,
                  contact.updatedAt,
                ),
              } as ContactPreview,
            ]),
          );
        }
      }

      const tagsWithCounts: TagWithCount[] = (tags || []).map((tag) => {
        const baseTag = tag as unknown as Tag;
        const pIds = includePreview ? previewMap.get(tag.id) || [] : [];
        const previewContacts = includePreview
          ? (pIds
              .map((id: string) => previewContactsById.get(id))
              .filter(Boolean) as ContactPreview[])
          : undefined;

        return {
          ...baseTag,
          contactCount: countMap.get(tag.id) || 0,
          previewContacts,
        };
      });

      return {
        tags: tagsWithCounts,
        totalCount: tagsWithCounts.length,
      };
    },
  );

  /**
   * POST /api/tags - Create a new tag (color auto-assigned)
   */
  fastify.post(
    "/",
    { schema: { body: CreateTagBody } },
    async (request: FastifyRequest<{ Body: { label: string } }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const body = request.body;

      const color = await pickNextColor(client, user.id);

      const { data: newTag, error } = await client
        .from("tags")
        .insert({ user_id: user.id, label: body.label.trim(), color })
        .select(TAG_SELECT)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.status(201).send({ tag: newTag });
    },
  );

  /**
   * PATCH /api/tags/:id - Update a tag label
   */
  fastify.patch(
    "/:id",
    { schema: { params: UuidParam, body: UpdateTagBody } },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { label?: string; color?: string } }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const body = request.body;

      const updates: Record<string, unknown> = {};

      if (body.label !== undefined) {
        updates.label = body.label.trim();
      }
      if (body.color !== undefined) updates.color = body.color;

      updates.updated_at = new Date().toISOString();

      const { error } = await client
        .from("tags")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Tag updated successfully" };
    },
  );

  /**
   * DELETE /api/tags/:id - Delete a single tag
   */
  fastify.delete(
    "/:id",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      const { error } = await client.from("tags").delete().eq("id", id).eq("user_id", user.id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Tag deleted successfully" };
    },
  );

  /**
   * DELETE /api/tags - Delete multiple tags
   */
  fastify.delete(
    "/",
    { schema: { body: IdsBody } },
    async (request: FastifyRequest<{ Body: { ids: string[] } }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { ids } = request.body;

      const { error } = await client.from("tags").delete().eq("user_id", user.id).in("id", ids);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Tags deleted successfully" };
    },
  );

  /**
   * GET /api/tags/:id/contacts - Get contacts that have this tag
   */
  fastify.get(
    "/:id/contacts",
    {
      schema: {
        params: UuidParam,
        querystring: Type.Object({
          avatarQuality: Type.Optional(AvatarQualityEnum),
          avatarSize: Type.Optional(AvatarSizeEnum),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { avatarQuality?: string; avatarSize?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: tagId } = request.params;
      const avatarOptions = extractAvatarOptions(request.query as any);

      const { data: memberships, error: membershipsError } = await client
        .from("people_tags")
        .select("person_id")
        .eq("tag_id", tagId);

      if (membershipsError) {
        return reply.status(500).send({ error: membershipsError.message });
      }

      const personIds = (memberships || []).map((m: { person_id: string }) => m.person_id);

      if (personIds.length === 0) {
        return { contacts: [], totalCount: 0 };
      }

      const { data: contacts, error: contactsError } = await client
        .from("people")
        .select("id, firstName:first_name, lastName:last_name, updatedAt:updated_at")
        .in("id", personIds)
        .eq("myself", false);

      if (contactsError) {
        return reply.status(500).send({ error: contactsError.message });
      }

      return {
        contacts: (contacts || []).map((c) => ({
          ...c,
          avatar: buildContactAvatarUrl(client, user.id, c.id, avatarOptions, c.updatedAt),
        })),
        totalCount: (contacts || []).length,
      };
    },
  );

  /**
   * POST /api/tags/:id/contacts - Add contacts to a tag
   */
  fastify.post(
    "/:id/contacts",
    { schema: { params: UuidParam, body: TagMembershipBody } },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { personIds: string[] } }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: tagId } = request.params;
      const { personIds } = request.body;

      // Verify tag ownership before adding contacts
      const { data: tag, error: tagError } = await client
        .from("tags")
        .select("id")
        .eq("id", tagId)
        .eq("user_id", user.id)
        .single();

      if (tagError || !tag) {
        return reply.status(404).send({ error: "Tag not found" });
      }

      const memberships = personIds.map((personId: string) => ({
        person_id: personId,
        tag_id: tagId,
        user_id: user.id,
      }));

      const { error } = await client.from("people_tags").upsert(memberships, {
        onConflict: "person_id,tag_id",
        ignoreDuplicates: true,
      });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Contacts added to tag successfully" };
    },
  );

  /**
   * DELETE /api/tags/:id/contacts - Remove contacts from a tag
   */
  fastify.delete(
    "/:id/contacts",
    { schema: { params: UuidParam, body: TagMembershipBody } },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { personIds: string[] } }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: tagId } = request.params;
      const { personIds } = request.body;

      // Verify tag ownership before removing contacts
      const { data: tag, error: tagError } = await client
        .from("tags")
        .select("id")
        .eq("id", tagId)
        .eq("user_id", user.id)
        .single();

      if (tagError || !tag) {
        return reply.status(404).send({ error: "Tag not found" });
      }

      const { error } = await client
        .from("people_tags")
        .delete()
        .eq("tag_id", tagId)
        .in("person_id", personIds);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Contacts removed from tag successfully" };
    },
  );
}
