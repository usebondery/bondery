/**
 * Groups — Membership Routes
 * Handles adding, removing, and listing contacts within a group.
 */

import {
  addContactsToGroupRequestSchema,
  addContactsToGroupResponseSchema,
  type Contact,
  groupContactsListResponseSchema,
  removeGroupMembersRequestSchema,
  removeGroupMembersResponseSchema,
} from "@bondery/schemas";
import { peopleListQuerySchema, uuidParamSchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { addGroupMembers, removeGroupMembers } from "../../domains/groups/index.js";
import { attachContactExtras } from "../../lib/contacts/enrichment.js";
import { resolveGroupMemberPersonIds } from "../../lib/contacts/resolve-group-member-ids.js";
import { resolveContactPersonIds } from "../../lib/contacts/resolve-person-ids.js";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  normalizeSearch,
  parsePagination,
  resolveSort,
} from "../../lib/data/pagination.js";
import {
  countSearchPeopleIds,
  restoreRankedOrder,
  searchPeopleIds,
} from "../../lib/data/search.js";
import { CONTACT_SELECT, extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import { badRequest, internal, notFound } from "../../lib/platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";

const EXISTING_MEMBERSHIP_LOOKUP_CHUNK_SIZE = 500;

async function _findExistingGroupMemberIds(
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
        description: "List paginated contacts in a group.",
        params: uuidParamSchema,
        querystring: peopleListQuerySchema,
        response: withOkResponse(groupContactsListResponseSchema, "Group members"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
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
        throw notFound("Group not found", "not_found");
      }

      // ── Fuzzy search path ──────────────────────────────────────────────
      // When a search query is active, use the search_people_ids RPC with
      // p_group_id to scope results to this group. Then fetch full rows
      // via .in() to preserve CONTACT_SELECT aliasing.
      let contacts: Contact[];
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
          throw internal("internal_server_error", searchResult.error);
        }

        if (countResult.error) {
          fastify.log.error(
            { rpcError: countResult.error },
            "Error in fuzzy search count RPC for group contacts",
          );
          throw internal("internal_server_error", countResult.error);
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
            fastify.log.error({ fetchError }, "Error fetching fuzzy group search results");
            throw internal("internal_server_error", fetchError.message);
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
          default:
            contactsQuery = contactsQuery.order("first_name", {
              ascending: true,
            });
            break;
        }

        contactsQuery = contactsQuery.range(offset, offset + limit - 1);

        const { data: contactRows, error: contactsError, count } = await contactsQuery;

        if (contactsError) {
          fastify.log.error({ contactsError }, "Failed to fetch contacts for group");
          throw internal("internal_server_error", contactsError.message);
        }

        // Strip the join helper field before passing contacts down the pipeline
        contacts = (contactRows || []).map((row) => {
          const { people_groups: _pg, ...contact } = row;
          return contact;
        });

        totalCount = typeof count === "number" ? count : contacts.length;
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
          emails: [],
          facebook: null,
          instagram: null,
          linkedin: null,
          phones: [],
          signal: null,
          website: null,
          whatsapp: null,
        }));
      }

      const pagination = buildPaginationMeta({
        itemCount: enrichedContacts.length,
        limit,
        offset,
        search,
        sort: effectiveSort,
        totalCount,
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
        body: addContactsToGroupRequestSchema,
        description: "Add contacts to a group by IDs or contact filter.",
        params: uuidParamSchema,
        response: withOkResponse(addContactsToGroupResponseSchema, "Contacts added to group"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      const { id: groupId } = request.params;
      const body = request.body;
      const { client, user } = ctx;

      let personIds: string[];

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
        throw badRequest(
          "Invalid request body. Provide either 'personIds' or 'contactFilter'.",
          "group_add_contacts_invalid_body",
        );
      }

      if (personIds.length === 0) {
        return {
          addedCount: 0,
          message: "No contacts matched the contact filter",
          skippedCount: 0,
        };
      }

      const { data } = await addGroupMembers(ctx, groupId, personIds);

      return {
        addedCount: data.addedCount,
        message: "Contacts added to group successfully",
        skippedCount: data.skippedCount,
      };
    }),
  );

  /**
   * DELETE /api/groups/:id/contacts - Remove contacts from a group
   * Accepts either { personIds: string[] } or { memberFilter: ContactsFilter, excludePersonIds?: string[] }.
   */
  fastify.delete(
    "/:id/contacts",
    {
      schema: {
        body: removeGroupMembersRequestSchema,
        description: "Remove contacts from a group by IDs or member filter.",
        params: uuidParamSchema,
        response: withOkResponse(removeGroupMembersResponseSchema, "Contacts removed from group"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      const { id: groupId } = request.params;
      const body = request.body;
      const { client, user } = ctx;

      let personIds: string[];

      if ("personIds" in body && Array.isArray(body.personIds)) {
        personIds = await resolveGroupMemberPersonIds(
          client,
          user.id,
          groupId,
          { personIds: body.personIds },
          {
            emptyExplicitError: "Invalid request body. 'personIds' must be a non-empty array.",
            rejectEmptyExplicit: true,
          },
        );
      } else if ("memberFilter" in body && body.memberFilter) {
        personIds = await resolveGroupMemberPersonIds(client, user.id, groupId, {
          excludePersonIds: Array.isArray(body.excludePersonIds)
            ? body.excludePersonIds
            : undefined,
          memberFilter: body.memberFilter as { search?: string; sort?: string },
        });
      } else {
        throw badRequest(
          "Invalid request body. Provide either 'personIds' or 'memberFilter'.",
          "group_remove_members_invalid_body",
        );
      }

      if (personIds.length === 0) {
        return { message: "No group members matched the member filter" };
      }

      const { data } = await removeGroupMembers(ctx, groupId, personIds);

      return {
        message: "Contacts removed from group successfully",
        removedCount: data.removedCount,
      };
    }),
  );
}
