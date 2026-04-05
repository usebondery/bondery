/**
 * Groups — Membership Routes
 * Handles adding, removing, and listing contacts within a group.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../lib/auth.js";
import { attachContactExtras } from "../../lib/contact-enrichment.js";
import {
  UuidParam,
  ContactsFilterSchema,
  ContactSortEnum,
  CONTACT_SELECT,
  AvatarQualityEnum,
  AvatarSizeEnum,
  extractAvatarOptions,
} from "../../lib/schemas.js";

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

export function registerGroupContactRoutes(fastify: FastifyInstance): void {
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

      // ── Fuzzy search path ──────────────────────────────────────────────
      // When a search query is active, use the search_people_ids RPC with
      // p_group_id to scope results to this group. Then fetch full rows
      // via .in() to preserve CONTACT_SELECT aliasing.
      let contacts: any[];
      let totalCount: number;

      if (search) {
        const { data: ranked, error: rpcError } = await client.rpc("search_people_ids", {
          p_user_id: user.id,
          p_query: search,
          p_limit: limit,
          p_offset: offset,
          p_group_id: groupId,
        });

        if (rpcError) {
          fastify.log.error({ rpcError }, "Error in fuzzy search RPC for group contacts");
          return reply.status(500).send({ error: rpcError.message });
        }

        if (!ranked || ranked.length === 0) {
          contacts = [];
          totalCount = 0;
        } else {
          const rankedIds = ranked.map((r: { id: string }) => r.id);

          const { data: fetchedContacts, error: fetchError } = await client
            .from("people")
            .select(CONTACT_SELECT)
            .in("id", rankedIds);

          if (fetchError) {
            fastify.log.error({ fetchError }, "Error fetching fuzzy group search results");
            return reply.status(500).send({ error: fetchError.message });
          }

          // Restore the relevance ordering from the RPC
          const orderMap = new Map(rankedIds.map((id: string, i: number) => [id, i]));
          contacts = (fetchedContacts || []).sort(
            (a: { id: string }, b: { id: string }) =>
              (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999),
          );
          totalCount = contacts.length;
        }
      } else {
        // ── Standard list path (no search) ────────────────────────────────
        // Build the query using a JOIN to avoid URL-length limits that occur
        // when passing large lists of person IDs via .in() for groups with many members.
        let contactsQuery = client
          .from("people")
          .select(`${CONTACT_SELECT}, people_groups!inner(group_id)`, { count: "exact" })
          .eq("myself", false)
          .eq("people_groups.group_id", groupId);

        switch (query.sort) {
          case "nameDesc":
            contactsQuery = contactsQuery.order("first_name", { ascending: false });
            break;
          case "surnameAsc":
            contactsQuery = contactsQuery.order("last_name", { ascending: true, nullsFirst: true });
            break;
          case "surnameDesc":
            contactsQuery = contactsQuery.order("last_name", {
              ascending: false,
              nullsFirst: false,
            });
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
        contacts = (contactRows || []).map((row: any) => {
          const { people_groups: _pg, ...contact } = row;
          return contact;
        });

        totalCount = typeof count === "number" ? count : contacts.length;
      }

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
      const { client, user } = getAuth(request);
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
        // Resolve matching member IDs via fuzzy search RPC when a search query is present,
        // otherwise fetch all group members.
        const search = typeof filterBody.filter.q === "string" ? filterBody.filter.q.trim() : "";
        if (search) {
          const { data: ranked, error: rpcError } = await client.rpc("search_people_ids", {
            p_user_id: user.id,
            p_query: search,
            p_limit: 10000,
            p_offset: 0,
            p_group_id: groupId,
          });

          if (rpcError) {
            return reply.status(500).send({ error: rpcError.message });
          }

          const excludeSet = new Set(filterBody.excludePersonIds ?? []);
          personIds = (ranked || [])
            .map((r: { id: string }) => r.id)
            .filter((id: string) => !excludeSet.has(id));
        } else {
          let filterQuery = client
            .from("people")
            .select("id, people_groups!inner(group_id)")
            .eq("myself", false)
            .eq("people_groups.group_id", groupId);

          const { data: rows, error: filterError } = await filterQuery;

          if (filterError) {
            return reply.status(500).send({ error: filterError.message });
          }

          const excludeSet = new Set(filterBody.excludePersonIds ?? []);
          personIds = (rows || [])
            .map((r: { id: string }) => r.id)
            .filter((id: string) => !excludeSet.has(id));
        }

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
