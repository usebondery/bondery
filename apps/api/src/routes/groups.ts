/**
 * Groups API Routes
 * Handles CRUD operations for groups and group memberships
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import type {
  Group,
  GroupWithCount,
  CreateGroupInput,
  UpdateGroupInput,
  DeleteGroupsRequest,
  GroupMembershipRequest,
  ContactPreview,
} from "@bondery/types";

// Group fields selection query for Supabase
const GROUP_SELECT = `
  id,
  userId:user_id,
  label,
  emoji,
  color,
  createdAt:created_at,
  updatedAt:updated_at
`;

// Contact fields selection query for Supabase (same as contacts.ts)
const CONTACT_SELECT = `
  id,
  userId:user_id,
  firstName:first_name,
  middleName:middle_name,
  lastName:last_name,
  title,
  place,
  description,
  notes,
  avatarColor:avatar_color,
  avatar,
  lastInteraction:last_interaction,
  createdAt:created_at,
  connections,
  linkedin,
  phones,
  emails,
  instagram,
  whatsapp,
  facebook,
  website,
  signal,
  birthdate,
  notifyBirthday:notify_birthday,
  importantDates:important_dates,
  myself,
  position,
  gender,
  language,
  timezone,
  nickname,
  pgpPublicKey:pgp_public_key,
  location,
  latitude,
  longitude
`;

export async function groupRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/groups - List all groups with contact counts
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
      const previewLimit = previewLimitRaw ? Number(previewLimitRaw) : undefined;
      const includePreview = Number.isFinite(previewLimit) && (previewLimit as number) > 0;

      // Get all groups
      const { data: groups, error: groupsError } = await client
        .from("groups")
        .select(GROUP_SELECT)
        .order("label", { ascending: true });

      if (groupsError) {
        return reply.status(500).send({ error: groupsError.message });
      }

      // Get contact counts (and optional previews) for each group
      const { data: memberships, error: countsError } = await client
        .from("people_groups")
        .select("group_id, person_id");

      if (countsError) {
        return reply.status(500).send({ error: countsError.message });
      }

      // Calculate counts per group
      const countMap = new Map<string, number>();
      const previewMap = new Map<string, string[]>();

      memberships?.forEach((item) => {
        const current = countMap.get(item.group_id) || 0;
        countMap.set(item.group_id, current + 1);

        if (!includePreview) return;

        const existing = previewMap.get(item.group_id) || [];
        if (existing.length < (previewLimit as number)) {
          existing.push(item.person_id);
          previewMap.set(item.group_id, existing);
        }
      });

      let previewContactsById = new Map<string, ContactPreview>();

      if (includePreview) {
        const previewIds = Array.from(new Set(Array.from(previewMap.values()).flat()));

        if (previewIds.length > 0) {
          const { data: previewContacts, error: previewError } = await client
            .from("people")
            .select(
              `id, firstName:first_name, lastName:last_name, avatar, avatarColor:avatar_color`,
            )
            .in("id", previewIds)
            .eq("myself", false);

          if (previewError) {
            return reply.status(500).send({ error: previewError.message });
          }

          previewContactsById = new Map(
            (previewContacts || []).map((contact) => [contact.id, contact as ContactPreview]),
          );
        }
      }

      // Combine groups with counts
      const groupsWithCounts: GroupWithCount[] = (groups || []).map((group) => {
        const baseGroup = group as unknown as Group;
        const previewIds = includePreview ? previewMap.get(group.id) || [] : [];
        const previewContacts = includePreview
          ? (previewIds
              .map((id) => previewContactsById.get(id))
              .filter(Boolean) as ContactPreview[])
          : undefined;

        return {
          ...baseGroup,
          contactCount: countMap.get(group.id) || 0,
          previewContacts,
        };
      });

      return {
        groups: groupsWithCounts,
        totalCount: groupsWithCounts.length,
      };
    },
  );

  /**
   * POST /api/groups - Create a new group
   */
  fastify.post(
    "/",
    async (request: FastifyRequest<{ Body: CreateGroupInput }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const body = request.body;

      // Validation
      if (!body.label || body.label.trim().length === 0) {
        return reply.status(400).send({ error: "Label is required" });
      }

      // Prepare insert data
      const insertData: any = {
        user_id: user.id,
        label: body.label.trim(),
        emoji: body.emoji?.trim() || null,
        color: body.color?.trim() || null,
      };

      // Insert group
      const { data: newGroup, error } = await client
        .from("groups")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.status(201).send({ id: newGroup.id });
    },
  );

  /**
   * GET /api/groups/:id - Get a single group
   */
  fastify.get(
    "/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id } = request.params;

      const { data: group, error } = await client
        .from("groups")
        .select(GROUP_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        return reply.status(404).send({ error: error.message });
      }

      return { group };
    },
  );

  /**
   * PATCH /api/groups/:id - Update a group
   */
  fastify.patch(
    "/:id",
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateGroupInput }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id } = request.params;
      const body = request.body;

      // Map camelCase to snake_case
      const updates: Record<string, unknown> = {};

      if (body.label !== undefined) {
        if (!body.label || body.label.trim().length === 0) {
          return reply.status(400).send({ error: "Label is required" });
        }
        updates.label = body.label;
      }
      if (body.emoji !== undefined) updates.emoji = body.emoji;
      if (body.color !== undefined) updates.color = body.color;

      updates.updated_at = new Date().toISOString();

      const { error } = await client.from("groups").update(updates).eq("id", id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Group updated successfully" };
    },
  );

  /**
   * DELETE /api/groups - Delete multiple groups
   */
  fastify.delete(
    "/",
    async (request: FastifyRequest<{ Body: DeleteGroupsRequest }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { ids } = request.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({
          error: "Invalid request body. 'ids' must be a non-empty array.",
        });
      }

      const { error } = await client.from("groups").delete().in("id", ids);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Groups deleted successfully" };
    },
  );

  /**
   * DELETE /api/groups/:id - Delete a single group
   */
  fastify.delete(
    "/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id } = request.params;

      const { error } = await client.from("groups").delete().eq("id", id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Group deleted successfully" };
    },
  );

  /**
   * GET /api/groups/:id/contacts - Get all contacts in a group
   */
  fastify.get(
    "/:id/contacts",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id: groupId } = request.params;

      // First verify the group exists
      const { data: group, error: groupError } = await client
        .from("groups")
        .select("id, label")
        .eq("id", groupId)
        .single();

      if (groupError || !group) {
        return reply.status(404).send({ error: "Group not found" });
      }

      // Get person IDs in this group
      const { data: memberships, error: membershipsError } = await client
        .from("people_groups")
        .select("person_id")
        .eq("group_id", groupId);

      if (membershipsError) {
        return reply.status(500).send({ error: membershipsError.message });
      }

      if (!memberships || memberships.length === 0) {
        return {
          group: { id: group.id, label: group.label },
          contacts: [],
          totalCount: 0,
        };
      }

      const personIds = memberships.map((m) => m.person_id);

      // Get contacts
      const { data: contacts, error: contactsError } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .in("id", personIds)
        .eq("myself", false);

      if (contactsError) {
        return reply.status(500).send({ error: contactsError.message });
      }

      return {
        group: { id: group.id, label: group.label },
        contacts: contacts || [],
        totalCount: contacts?.length || 0,
      };
    },
  );

  /**
   * POST /api/groups/:id/contacts - Add contacts to a group
   */
  fastify.post(
    "/:id/contacts",
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: GroupMembershipRequest }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: groupId } = request.params;
      const { personIds } = request.body;

      if (!Array.isArray(personIds) || personIds.length === 0) {
        return reply.status(400).send({
          error: "Invalid request body. 'personIds' must be a non-empty array.",
        });
      }

      // Verify group exists
      const { data: group, error: groupError } = await client
        .from("groups")
        .select("id")
        .eq("id", groupId)
        .single();

      if (groupError || !group) {
        return reply.status(404).send({ error: "Group not found" });
      }

      // Insert memberships (upsert to avoid duplicates)
      const memberships = personIds.map((personId) => ({
        person_id: personId,
        group_id: groupId,
        user_id: user.id,
      }));

      const { error } = await client.from("people_groups").upsert(memberships, {
        onConflict: "person_id,group_id",
        ignoreDuplicates: true,
      });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Contacts added to group successfully" };
    },
  );

  /**
   * DELETE /api/groups/:id/contacts - Remove contacts from a group
   */
  fastify.delete(
    "/:id/contacts",
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: GroupMembershipRequest }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id: groupId } = request.params;
      const { personIds } = request.body;

      if (!Array.isArray(personIds) || personIds.length === 0) {
        return reply.status(400).send({
          error: "Invalid request body. 'personIds' must be a non-empty array.",
        });
      }

      const { error } = await client
        .from("people_groups")
        .delete()
        .eq("group_id", groupId)
        .in("person_id", personIds);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Contacts removed from group successfully" };
    },
  );
}
