/**
 * Groups API Routes
 * Handles CRUD operations for groups and group memberships
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import { attachContactChannels } from "../lib/contact-channels.js";
import { attachContactSocialMedia } from "../lib/social-media.js";
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
export const GROUP_SELECT = `
  id,
  userId:user_id,
  label,
  emoji,
  color,
  createdAt:created_at,
  updatedAt:updated_at
`;

// Contact fields selection query for Supabase — must be kept in sync with contacts.ts
// (Cannot import directly from contacts.ts to avoid a circular dependency with GROUP_SELECT)
const CONTACT_SELECT = `
  id,
  userId:user_id,
  firstName:first_name,
  middleName:middle_name,
  lastName:last_name,
  headline,
  place,
  notes,
  avatar,
  lastInteraction:last_interaction,
  createdAt:created_at,
  myself,
  language,
  timezone,
  location,
  latitude,
  longitude,
  addressLine1:address_line1,
  addressLine2:address_line2,
  addressCity:address_city,
  addressPostalCode:address_postal_code,
  addressState:address_state,
  addressStateCode:address_state_code,
  addressCountry:address_country,
  addressCountryCode:address_country_code,
  addressGranularity:address_granularity,
  addressFormatted:address_formatted,
  addressGeocodeSource:address_geocode_source
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
            .select(`id, firstName:first_name, lastName:last_name, avatar`)
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
   * GET /api/groups/:id/contacts - Get paginated contacts in a group
   */
  fastify.get(
    "/:id/contacts",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: {
          limit?: string;
          offset?: string;
          q?: string;
          sort?:
            | "nameAsc"
            | "nameDesc"
            | "surnameAsc"
            | "surnameDesc"
            | "interactionAsc"
            | "interactionDesc";
        };
      }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: groupId } = request.params;
      const query = request.query || {};

      const parsedLimit = Number.parseInt(query.limit || "", 10);
      const parsedOffset = Number.parseInt(query.offset || "", 10);
      const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
      const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
      const search = typeof query.q === "string" ? query.q.trim() : "";

      // First verify the group exists
      const { data: group, error: groupError } = await client
        .from("groups")
        .select("id, label")
        .eq("id", groupId)
        .single();

      if (groupError || !group) {
        return reply.status(404).send({ error: "Group not found" });
      }

      // Build the query using a JOIN to avoid URL-length limits that occur
      // when passing large lists of person IDs via .in() for groups with many members.
      let contactsQuery = client
        .from("people")
        .select(`${CONTACT_SELECT}, people_groups!inner(group_id)`, { count: "exact" })
        .eq("myself", false)
        .eq("people_groups.group_id", groupId);

      if (search) {
        const searchTokens = search.split(/\s+/).filter(Boolean);
        for (const token of searchTokens) {
          contactsQuery = contactsQuery.or(
            `first_name.ilike.%${token}%,last_name.ilike.%${token}%`,
          );
        }
      }

      switch (query.sort) {
        case "nameDesc":
          contactsQuery = contactsQuery.order("first_name", { ascending: false });
          break;
        case "surnameAsc":
          contactsQuery = contactsQuery.order("last_name", { ascending: true, nullsFirst: true });
          break;
        case "surnameDesc":
          contactsQuery = contactsQuery.order("last_name", { ascending: false, nullsFirst: false });
          break;
        case "interactionAsc":
          contactsQuery = contactsQuery.order("last_interaction", {
            ascending: true,
            nullsFirst: true,
          });
          break;
        case "interactionDesc":
          contactsQuery = contactsQuery.order("last_interaction", {
            ascending: false,
            nullsFirst: false,
          });
          break;
        case "nameAsc":
        default:
          contactsQuery = contactsQuery.order("first_name", { ascending: true });
          break;
      }

      if (limit !== null) {
        contactsQuery = contactsQuery.range(offset, offset + limit - 1);
      }

      const { data: contactRows, error: contactsError, count } = await contactsQuery;

      if (contactsError) {
        fastify.log.error({ contactsError }, "Failed to fetch contacts for group");
        return reply.status(500).send({ error: contactsError.message });
      }

      // Strip the join helper field before passing contacts down the pipeline
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contacts = (contactRows || []).map((row: any) => {
        const { people_groups: _pg, ...contact } = row;
        return contact;
      });

      const totalCount = typeof count === "number" ? count : contacts.length;

      if (contacts.length === 0) {
        return {
          group: { id: group.id, label: group.label },
          contacts: [],
          totalCount,
        };
      }

      let contactsWithChannels = contacts;
      try {
        contactsWithChannels = await attachContactChannels(client, user.id, contacts || []);
      } catch (channelError) {
        fastify.log.error({ channelError }, "Failed to attach contact channels for group contacts");
        contactsWithChannels = (contacts || []).map((contact) => ({
          ...contact,
          phones: [],
          emails: [],
        }));
      }

      let contactsWithSocialMedia = contactsWithChannels;
      try {
        contactsWithSocialMedia = await attachContactSocialMedia(
          client,
          user.id,
          contactsWithChannels,
        );
      } catch (socialError) {
        fastify.log.error({ socialError }, "Failed to attach social media for group contacts");
        contactsWithSocialMedia = contactsWithChannels.map((contact) => ({
          ...contact,
          linkedin: null,
          instagram: null,
          whatsapp: null,
          facebook: null,
          website: null,
          signal: null,
        }));
      }

      return {
        group: { id: group.id, label: group.label },
        contacts: contactsWithSocialMedia,
        totalCount,
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
