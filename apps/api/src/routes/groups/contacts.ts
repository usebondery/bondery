/**
 * Groups — Membership Routes
 * Handles adding, removing, and listing contacts within a group.
 */

import type { FastifyReply } from "fastify";
import type { AppFastifyInstance } from "../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../lib/auth.js";
import { searchPeopleIds, restoreRankedOrder, countSearchPeopleIds } from "../../lib/search.js";
import { attachContactExtras } from "../../lib/contact-enrichment.js";
import {
  resolveContactPersonIds,
  ResolveContactPersonIdsError,
} from "../../lib/resolve-contact-person-ids.js";
import {
  resolveGroupMemberPersonIds,
  ResolveGroupMemberPersonIdsError,
} from "../../lib/resolve-group-member-person-ids.js";
import { CONTACT_SELECT, extractAvatarOptions } from "../../lib/queries.js";
import { peopleListQuerySchema, uuidParamSchema } from "@bondery/schemas/http";
import {
  addContactsToGroupRequestSchema,
  removeGroupMembersRequestSchema,
} from "@bondery/schemas";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  normalizeSearch,
  parsePagination,
  resolveSort,
} from "../../lib/pagination.js";

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

export function registerGroupContactRoutes(fastify: AppFastifyInstance): void {
  /**
   * GET /api/groups/:id/contacts - Get paginated contacts in a group
   */
  fastify.get(
    "/:id/contacts",
    {
      schema: {
        params: uuidParamSchema,
        querystring: peopleListQuerySchema,
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id: groupId } = request.params;
      const query = request.query;

      const { limit, offset } = parsePagination(query);
      const search = normalizeSearch(query.search);
      const effectiveSort = resolveSort(query.sort, "nameAsc");
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
        const [searchResult, countResult] = await Promise.all([
          searchPeopleIds(client, user.id, search, limit, offset, { groupId }),
          countSearchPeopleIds(client, user.id, search, { groupId }),
        ]);

        if (searchResult.error) {
          fastify.log.error(
            { rpcError: searchResult.error },
            "Error in fuzzy search RPC for group contacts",
          );
          return reply.status(500).send({ error: searchResult.error });
        }

        if (countResult.error) {
          fastify.log.error(
            { rpcError: countResult.error },
            "Error in fuzzy search count RPC for group contacts",
          );
          return reply.status(500).send({ error: countResult.error });
        }

        totalCount = countResult.count ?? 0;

        if (!searchResult.ranked || searchResult.ranked.length === 0) {
          contacts = [];
        } else {
          const rankedIds = searchResult.ranked.map((r) => r.id);

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

      const pagination = buildPaginationMeta({
        limit,
        offset,
        totalCount,
        itemCount: enrichedContacts.length,
        sort: effectiveSort,
        search,
      });

      return {
        group: { id: group.id, label: group.label },
        ...buildPaginatedResponse("contacts", enrichedContacts, pagination),
      };
    },
  );

  /**
   * POST /api/groups/:id/contacts - Add contacts to a group
   */
  fastify.post(
    "/:id/contacts",
    {
      schema: {
        params: uuidParamSchema,
        body: addContactsToGroupRequestSchema,
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
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
            contactFilter: body.contactFilter as { search?: string; sort?: string },
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
    {
      schema: {
        params: uuidParamSchema,
        body: removeGroupMembersRequestSchema,
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
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
            memberFilter: body.memberFilter as { search?: string; sort?: string },
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
