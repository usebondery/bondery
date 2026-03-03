/**
 * Tags API Routes
 * Handles CRUD operations for tags and tag memberships on contacts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import type {
  Tag,
  TagWithCount,
  CreateTagInput,
  UpdateTagInput,
  DeleteTagsRequest,
  TagMembershipRequest,
  ContactPreview,
} from "@bondery/types";

// Tag fields selection query for Supabase
export const TAG_SELECT = `
  id,
  userId:user_id,
  label,
  color,
  createdAt:created_at,
  updatedAt:updated_at
`;

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
  /**
   * GET /api/tags - List all tags with contact counts and preview contacts
   */
  fastify.get(
    "/",
    async (
      request: FastifyRequest<{ Querystring: { previewLimit?: string } }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;

      const previewLimitRaw = request.query?.previewLimit;
      const previewLimit = previewLimitRaw ? Number(previewLimitRaw) : 3;
      const includePreview = previewLimit > 0;

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
            .select(`id, firstName:first_name, lastName:last_name, avatar`)
            .in("id", previewIds)
            .eq("myself", false);

          if (previewError) {
            return reply.status(500).send({ error: previewError.message });
          }

          previewContactsById = new Map(
            (previewContacts || []).map((contact: ContactPreview) => [contact.id, contact]),
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
    async (request: FastifyRequest<{ Body: CreateTagInput }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const body = request.body;

      if (!body.label || body.label.trim().length === 0) {
        return reply.status(400).send({ error: "Label is required" });
      }

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
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateTagInput }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id } = request.params;
      const body = request.body;

      const updates: Record<string, unknown> = {};

      if (body.label !== undefined) {
        if (!body.label || body.label.trim().length === 0) {
          return reply.status(400).send({ error: "Label is required" });
        }
        updates.label = body.label.trim();
      }
      if (body.color !== undefined) updates.color = body.color;

      updates.updated_at = new Date().toISOString();

      const { error } = await client.from("tags").update(updates).eq("id", id);

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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id } = request.params;

      const { error } = await client.from("tags").delete().eq("id", id);

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
    async (request: FastifyRequest<{ Body: DeleteTagsRequest }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { ids } = request.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({
          error: "Invalid request body. 'ids' must be a non-empty array.",
        });
      }

      const { error } = await client.from("tags").delete().in("id", ids);

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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id: tagId } = request.params;

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
        .select("id, firstName:first_name, lastName:last_name, avatar")
        .in("id", personIds)
        .eq("myself", false);

      if (contactsError) {
        return reply.status(500).send({ error: contactsError.message });
      }

      return { contacts: contacts || [], totalCount: (contacts || []).length };
    },
  );

  /**
   * POST /api/tags/:id/contacts - Add contacts to a tag
   */
  fastify.post(
    "/:id/contacts",
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: TagMembershipRequest }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: tagId } = request.params;
      const { personIds } = request.body;

      if (!Array.isArray(personIds) || personIds.length === 0) {
        return reply.status(400).send({
          error: "Invalid request body. 'personIds' must be a non-empty array.",
        });
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
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: TagMembershipRequest }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id: tagId } = request.params;
      const { personIds } = request.body;

      if (!Array.isArray(personIds) || personIds.length === 0) {
        return reply.status(400).send({
          error: "Invalid request body. 'personIds' must be a non-empty array.",
        });
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
