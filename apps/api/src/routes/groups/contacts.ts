/**
 * Groups — Membership Routes
 * Handles adding, removing, and listing contacts within a group.
 */

import {
  addContactsToGroupRequestSchema,
  addContactsToGroupResponseSchema,
  groupContactsListResponseSchema,
  removeGroupMembersRequestSchema,
  removeGroupMembersResponseSchema,
} from "@bondery/schemas";
import { peopleListQuerySchema, uuidParamSchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { addGroupMembers, removeGroupMembers } from "../../domains/groups/index.js";
import { resolveGroupMemberPersonIds } from "../../lib/contacts/resolve-group-member-ids.js";
import { resolveContactPersonIds } from "../../lib/contacts/resolve-person-ids.js";
import { domainContextFromRequest } from "../../lib/platform/domain-context.js";
import { badRequest } from "../../lib/platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";
import { listGroupMembers } from "../../services/groups/queries.js";

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
        summary: "List group members",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      const { id: groupId } = request.params;
      return listGroupMembers(ctx, groupId, request.query);
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
        summary: "Add contacts to a group",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: addContactsToGroupRequestSchema, params: uuidParamSchema },
      async (ctx, { body, params }) => {
        const groupId = params.id;
        const { user } = ctx;
        const db = domainDb(ctx);

        let personIds: string[];

        if ("personIds" in body && Array.isArray(body.personIds)) {
          personIds = await resolveContactPersonIds(
            db,
            user.id,
            { personIds: body.personIds },
            { rejectEmptyExplicit: true },
          );
        } else if ("contactFilter" in body && body.contactFilter) {
          personIds = await resolveContactPersonIds(db, user.id, {
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
      },
    ),
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
        summary: "Remove contacts from a group",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: removeGroupMembersRequestSchema, params: uuidParamSchema },
      async (ctx, { body, params }) => {
        const groupId = params.id;
        const { user } = ctx;
        const db = domainDb(ctx);

        let personIds: string[];

        if ("personIds" in body && Array.isArray(body.personIds)) {
          personIds = await resolveGroupMemberPersonIds(
            db,
            user.id,
            groupId,
            { personIds: body.personIds },
            {
              emptyExplicitError: "Invalid request body. 'personIds' must be a non-empty array.",
              rejectEmptyExplicit: true,
            },
          );
        } else if ("memberFilter" in body && body.memberFilter) {
          personIds = await resolveGroupMemberPersonIds(db, user.id, groupId, {
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
      },
    ),
  );
}
