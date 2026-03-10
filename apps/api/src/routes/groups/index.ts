/**
 * Groups API Routes
 * Handles CRUD operations for groups and group memberships
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../lib/auth.js";
import { attachContactExtras } from "../../lib/contact-enrichment.js";
import {
  UuidParam,
  IdsBody,
  ContactsFilterSchema,
  ContactSortEnum,
  GROUP_SELECT,
  CONTACT_SELECT,
  AvatarQualityEnum,
  AvatarSizeEnum,
  extractAvatarOptions,
} from "../../lib/schemas.js";
import { buildContactAvatarUrl } from "../../lib/supabase.js";
import type { Group, GroupWithCount, ContactPreview } from "@bondery/types";

// ── TypeBox Schemas ──────────────────────────────────────────────────────────

const GroupsQuery = Type.Object({
  previewLimit: Type.Optional(Type.String()),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

const CreateGroupBody = Type.Object({
  label: Type.String({ minLength: 1 }),
  emoji: Type.Optional(Type.String()),
  color: Type.Optional(Type.String()),
});

const UpdateGroupBody = Type.Object({
  label: Type.Optional(Type.String({ minLength: 1 })),
  emoji: Type.Optional(Type.String()),
  color: Type.Optional(Type.String()),
});

const GroupContactsQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  q: Type.Optional(Type.String()),
  sort: Type.Optional(ContactSortEnum),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

const GroupAddContactsBody = Type.Object({
  personIds: Type.Array(Type.String(), { minItems: 1 }),
});

const GroupRemoveContactsBody = Type.Union([
  Type.Object({
    personIds: Type.Array(Type.String(), { minItems: 1 }),
  }),
  Type.Object({
    filter: ContactsFilterSchema,
    excludePersonIds: Type.Optional(Type.Array(Type.String())),
  }),
]);

export async function groupRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Groups"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * GET /api/groups - List all groups with contact counts
   */
  fastify.get(
    "/",
    { schema: { querystring: GroupsQuery } },
    async (
      request: FastifyRequest<{ Querystring: typeof GroupsQuery.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);

      const previewLimitRaw = request.query?.previewLimit;
      const previewLimit = previewLimitRaw ? Number(previewLimitRaw) : undefined;
      const includePreview = Number.isFinite(previewLimit) && (previewLimit as number) > 0;
      const avatarOptions = extractAvatarOptions(request.query);

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
    { schema: { body: CreateGroupBody } },
    async (
      request: FastifyRequest<{ Body: { label: string; emoji?: string; color?: string } }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const body = request.body;

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
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      const { data: group, error } = await client
        .from("groups")
        .select(GROUP_SELECT)
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) {
        return reply.status(404).send({ error: "Group not found" });
      }

      return { group };
    },
  );

  /**
   * PATCH /api/groups/:id - Update a group
   */
  fastify.patch(
    "/:id",
    { schema: { params: UuidParam, body: UpdateGroupBody } },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { label?: string; emoji?: string; color?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const body = request.body;

      // Map camelCase to snake_case
      const updates: Record<string, unknown> = {};

      if (body.label !== undefined) {
        updates.label = body.label;
      }
      if (body.emoji !== undefined) updates.emoji = body.emoji;
      if (body.color !== undefined) updates.color = body.color;

      updates.updated_at = new Date().toISOString();

      const { error } = await client
        .from("groups")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

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
    { schema: { body: IdsBody } },
    async (request: FastifyRequest<{ Body: { ids: string[] } }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { ids } = request.body;

      const { error } = await client.from("groups").delete().eq("user_id", user.id).in("id", ids);

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
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      const { error } = await client.from("groups").delete().eq("id", id).eq("user_id", user.id);

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
    { schema: { params: UuidParam, querystring: GroupContactsQuery } },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: typeof GroupContactsQuery.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: groupId } = request.params;
      const query = request.query || {};

      const limit = Math.min(query.limit ?? 50, 200);
      const offset = query.offset ?? 0;
      const search = typeof query.q === "string" ? query.q.trim() : "";
      const avatarOptions = extractAvatarOptions(query);

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

      contactsQuery = contactsQuery.range(offset, offset + limit - 1);

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

      let enrichedContacts = contacts;
      try {
        enrichedContacts = await attachContactExtras(client, user.id, contacts || [], {
          avatarOptions,
        });
      } catch (enrichError) {
        fastify.log.error(
          { enrichError },
          "Failed to attach contact channels/social media for group contacts",
        );
        enrichedContacts = (contacts || []).map((contact) => ({
          ...contact,
          phones: [],
          emails: [],
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
        contacts: enrichedContacts,
        totalCount,
        limit,
        offset,
      };
    },
  );

  /**
   * POST /api/groups/:id/contacts - Add contacts to a group
   */
  fastify.post(
    "/:id/contacts",
    { schema: { params: UuidParam, body: GroupAddContactsBody } },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { personIds: string[] } }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: groupId } = request.params;
      const { personIds } = request.body;

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
   * Accepts either { personIds: string[] } or { filter: ContactsFilter, excludePersonIds?: string[] }.
   */
  fastify.delete(
    "/:id/contacts",
    { schema: { params: UuidParam, body: GroupRemoveContactsBody } },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
      reply: FastifyReply,
    ) => {
      const { client } = getAuth(request);
      const { id: groupId } = request.params;
      const body = request.body;

      let personIds: string[];

      if ("personIds" in body && Array.isArray(body.personIds)) {
        if (body.personIds.length === 0) {
          return reply.status(400).send({
            error: "Invalid request body. 'personIds' must be a non-empty array.",
          });
        }
        personIds = body.personIds;
      } else if ("filter" in body && body.filter) {
        const filterBody = body as { filter: { q?: string }; excludePersonIds?: string[] };
        // Resolve matching member IDs via the same query pattern as GET /groups/:id/contacts.
        let filterQuery = client
          .from("people")
          .select("id, people_groups!inner(group_id)")
          .eq("myself", false)
          .eq("people_groups.group_id", groupId);

        const search = typeof filterBody.filter.q === "string" ? filterBody.filter.q.trim() : "";
        if (search) {
          const searchTokens = search.split(/\s+/).filter(Boolean);
          for (const token of searchTokens) {
            filterQuery = filterQuery.or(`first_name.ilike.%${token}%,last_name.ilike.%${token}%`);
          }
        }

        const { data: rows, error: filterError } = await filterQuery;

        if (filterError) {
          return reply.status(500).send({ error: filterError.message });
        }

        const excludeSet = new Set(filterBody.excludePersonIds ?? []);
        personIds = (rows || [])
          .map((r: { id: string }) => r.id)
          .filter((id: string) => !excludeSet.has(id));

        if (personIds.length === 0) {
          return { message: "No contacts matched the filter" };
        }
      } else {
        return reply.status(400).send({
          error: "Invalid request body. Provide either 'personIds' or 'filter'.",
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

      return {
        message: "Contacts removed from group successfully",
        removedCount: personIds.length,
      };
    },
  );
}
