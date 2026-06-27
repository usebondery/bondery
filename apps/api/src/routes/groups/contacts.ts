/**
 * Groups — Membership Routes
 * Handles adding, removing, and listing contacts within a group.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../lib/auth.js";
import { searchPeopleIds, restoreRankedOrder } from "../../lib/search.js";
import { attachContactExtras } from "../../lib/contact-enrichment.js";
import {
  resolveContactPersonIds,
  ResolveContactPersonIdsError,
} from "../../lib/resolve-contact-person-ids.js";
import {
  resolveGroupMemberPersonIds,
  ResolveGroupMemberPersonIdsError,
} from "../../lib/resolve-group-member-person-ids.js";
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

const GroupAddContactsBody = Type.Union([
  Type.Object({
    personIds: Type.Array(Type.String(), { minItems: 1 }),
  }),
  Type.Object({
    contactFilter: ContactsFilterSchema,
    excludePersonIds: Type.Optional(Type.Array(Type.String())),
  }),
]);

const GroupRemoveContactsBody = Type.Union([
  Type.Object({
    personIds: Type.Array(Type.String(), { minItems: 1 }),
  }),
  Type.Object({
    memberFilter: ContactsFilterSchema,
    excludePersonIds: Type.Optional(Type.Array(Type.String())),
  }),
]);

const EXISTING_MEMBERSHIP_LOOKUP_CHUNK_SIZE = 500;

async function findExistingGroupMemberIds(
  client: ReturnType<typeof getAuth>["client"],
  groupId: string,
  personIds: string[],
): Promise<Set<string>> {
  const existingIds = new Set<string>();

  for (let offset = 0; offset < personIds.length; offset += EXISTING_MEMBERSHIP_LOOKUP_CHUNK_SIZE) {
    const chunk = personIds.slice(offset, offset + EXISTING_MEMBERSHIP_LOOKUP_CHUNK_SIZE);
    const { data, error } = await client
      .from("people_groups")
      .select("person_id")
      .eq("group_id", groupId)
      .in("person_id", chunk);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      existingIds.add(row.person_id);
    }
  }

  return existingIds;
}

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
        const { ranked, error: rpcError } = await searchPeopleIds(
          client,
          user.id,
          search,
          limit,
          offset,
          groupId,
        );

        if (rpcError) {
          fastify.log.error(
            { rpcError },
            "Error in fuzzy search RPC for group contacts",
          );
          return reply.status(500).send({ error: rpcError });
        }

        if (!ranked || ranked.length === 0) {
          contacts = [];
          totalCount = 0;
        } else {
          const rankedIds = ranked.map((r) => r.id);

          const { data: fetchedContacts, error: fetchError } = await client
            .from("people")
            .select(CONTACT_SELECT)
            .in("id", rankedIds);

          if (fetchError) {
            fastify.log.error(
              { fetchError },
              "Error fetching fuzzy group search results",
            );
            return reply.status(500).send({ error: fetchError.message });
          }

          contacts = restoreRankedOrder(fetchedContacts || [], rankedIds);
          totalCount = contacts.length;
        }
      } else {
        // ── Standard list path (no search) ────────────────────────────────
        // Build the query using a JOIN to avoid URL-length limits that occur
        // when passing large lists of person IDs via .in() for groups with many members.
        let contactsQuery = client
          .from("people")
          .select(`${CONTACT_SELECT}, people_groups!inner(group_id)`, {
            count: "exact",
          })
          .eq("myself", false)
          .eq("people_groups.group_id", groupId);

        switch (query.sort) {
          case "nameDesc":
            contactsQuery = contactsQuery.order("first_name", {
              ascending: false,
            });
            break;
          case "surnameAsc":
            contactsQuery = contactsQuery.order("last_name", {
              ascending: true,
              nullsFirst: true,
            });
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
            contactsQuery = contactsQuery.order("first_name", {
              ascending: true,
            });
            break;
        }

        contactsQuery = contactsQuery.range(offset, offset + limit - 1);

        const {
          data: contactRows,
          error: contactsError,
          count,
        } = await contactsQuery;

        if (contactsError) {
          fastify.log.error(
            { contactsError },
            "Failed to fetch contacts for group",
          );
          return reply.status(500).send({ error: contactsError.message });
        }

        // Strip the join helper field before passing contacts down the pipeline
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
        enrichedContacts = await attachContactExtras(
          client,
          user.id,
          contacts || [],
          {
            avatarOptions,
          },
        );
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
      request: FastifyRequest<{
        Params: { id: string };
        Body: Record<string, unknown>;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: groupId } = request.params;
      const body = request.body;

      const { data: group, error: groupError } = await client
        .from("groups")
        .select("id")
        .eq("id", groupId)
        .single();

      if (groupError || !group) {
        return reply.status(404).send({ error: "Group not found" });
      }

      let personIds: string[];

      try {
        if ("personIds" in body && Array.isArray(body.personIds)) {
          personIds = await resolveContactPersonIds(
            client,
            user.id,
            { personIds: body.personIds },
            { rejectEmptyExplicit: true },
          );
        } else if ("contactFilter" in body && body.contactFilter) {
          personIds = await resolveContactPersonIds(client, user.id, {
            contactFilter: body.contactFilter as { q?: string },
            excludePersonIds: Array.isArray(body.excludePersonIds)
              ? body.excludePersonIds
              : undefined,
          });
        } else {
          return reply.status(400).send({
            error:
              "Invalid request body. Provide either 'personIds' or 'contactFilter'.",
          });
        }
      } catch (error) {
        if (error instanceof ResolveContactPersonIdsError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }

        throw error;
      }

      if (personIds.length === 0) {
        return {
          message: "No contacts matched the contact filter",
          addedCount: 0,
          skippedCount: 0,
        };
      }

      let existingMemberIds: Set<string>;

      try {
        existingMemberIds = await findExistingGroupMemberIds(client, groupId, personIds);
      } catch (lookupError) {
        const message =
          lookupError instanceof Error
            ? lookupError.message
            : "Failed to check existing group memberships";
        return reply.status(500).send({ error: message });
      }

      const skippedCount = existingMemberIds.size;
      const newPersonIds = personIds.filter((personId) => !existingMemberIds.has(personId));
      const addedCount = newPersonIds.length;

      if (newPersonIds.length === 0) {
        return {
          message: "All contacts were already in the group",
          addedCount: 0,
          skippedCount,
        };
      }

      // Insert memberships (upsert to avoid duplicates)
      const memberships = newPersonIds.map((personId) => ({
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

      return {
        message: "Contacts added to group successfully",
        addedCount,
        skippedCount,
      };
    },
  );

  /**
   * DELETE /api/groups/:id/contacts - Remove contacts from a group
   * Accepts either { personIds: string[] } or { memberFilter: ContactsFilter, excludePersonIds?: string[] }.
   */
  fastify.delete(
    "/:id/contacts",
    { schema: { params: UuidParam, body: GroupRemoveContactsBody } },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Record<string, unknown>;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id: groupId } = request.params;
      const body = request.body;

      let personIds: string[];

      try {
        if ("personIds" in body && Array.isArray(body.personIds)) {
          personIds = await resolveGroupMemberPersonIds(
            client,
            user.id,
            groupId,
            { personIds: body.personIds },
            {
              rejectEmptyExplicit: true,
              emptyExplicitError:
                "Invalid request body. 'personIds' must be a non-empty array.",
            },
          );
        } else if ("memberFilter" in body && body.memberFilter) {
          personIds = await resolveGroupMemberPersonIds(client, user.id, groupId, {
            memberFilter: body.memberFilter as { q?: string },
            excludePersonIds: Array.isArray(body.excludePersonIds)
              ? body.excludePersonIds
              : undefined,
          });
        } else {
          return reply.status(400).send({
            error:
              "Invalid request body. Provide either 'personIds' or 'memberFilter'.",
          });
        }
      } catch (error) {
        if (error instanceof ResolveGroupMemberPersonIdsError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }

        throw error;
      }

      if (personIds.length === 0) {
        return { message: "No group members matched the member filter" };
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
