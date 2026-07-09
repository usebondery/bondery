/**
 * Contacts — Relationship Routes
 * Handles creation, retrieval, and deletion of relationships between contacts.
 */

import type { RelationshipType } from "@bondery/schemas";
import {
  contactRelationshipResponseSchema,
  contactRelationshipsResponseSchema,
  createContactRelationshipInputSchema,
  messageResponseSchema,
  updateContactRelationshipInputSchema,
} from "@bondery/schemas";
import {
  avatarTransformQuerySchema,
  contactRelationshipIdParamSchema,
  uuidParamSchema,
} from "@bondery/schemas/http";
import { conflictResponse } from "@bondery/schemas/http/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import {
  createRelationship,
  deleteRelationship,
  updateRelationship,
} from "../../../domains/contacts/relationships.js";
import { extractAvatarOptions } from "../../../lib/data/select-fragments.js";
import { resolveContactAvatarUrl } from "../../../lib/data/supabase.js";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import { internal, notFound } from "../../../lib/platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withCreatedResponse, withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

// ── Constants ────────────────────────────────────────────────────

const RELATIONSHIP_SELECT = `
  id,
  user_id,
  source_person_id,
  target_person_id,
  relationship_type,
  created_at,
  updated_at
`;

const RELATIONSHIP_TYPES: RelationshipType[] = [
  "parent",
  "child",
  "spouse",
  "partner",
  "sibling",
  "friend",
  "colleague",
  "neighbor",
  "guardian",
  "dependent",
  "other",
] satisfies RelationshipType[];

// ── Helpers ──────────────────────────────────────────────────────

function _isRelationshipType(value: string): value is RelationshipType {
  return RELATIONSHIP_TYPES.includes(value as RelationshipType);
}

function toContactPreview(
  person: {
    id: string;
    first_name: string;
    last_name: string | null;
  },
  avatarUrl: string | null,
) {
  return {
    avatar: avatarUrl,
    firstName: person.first_name,
    id: person.id,
    lastName: person.last_name,
  };
}

// ── Route Registration ───────────────────────────────────────────

export function registerRelationshipRoutes(fastify: AppFastifyInstance): void {
  /**
   * GET /api/contacts/:id/relationships - Get all relationships for a person
   */
  fastify.get(
    "/:id/relationships",
    {
      schema: {
        description: "List relationships for a contact.",
        params: uuidParamSchema,
        querystring: avatarTransformQuerySchema,
        response: withOkResponse(contactRelationshipsResponseSchema, "Contact relationships"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const avatarOpts = extractAvatarOptions(request.query);
      const { id: personId } = request.params;

      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        throw notFound("Contact not found", "not_found");
      }

      const { data: rows, error: rowsError } = await client
        .from("people_relationships")
        .select(RELATIONSHIP_SELECT)
        .or(`source_person_id.eq.${personId},target_person_id.eq.${personId}`)
        .order("created_at", { ascending: true });

      if (rowsError) {
        throw internal("internal_server_error", rowsError.message);
      }

      const relationships = rows || [];
      if (relationships.length === 0) {
        return { relationships: [] };
      }

      const personIds = Array.from(
        new Set(
          relationships.flatMap((relationship) => [
            relationship.source_person_id,
            relationship.target_person_id,
          ]),
        ),
      );

      const { data: peopleRows, error: peopleError } = await client
        .from("people")
        .select("id, first_name, last_name, updated_at, has_avatar")
        .in("id", personIds)
        .eq("user_id", user.id);

      if (peopleError) {
        throw internal("internal_server_error", peopleError.message);
      }

      const peopleById = new Map((peopleRows || []).map((personRow) => [personRow.id, personRow]));

      const formattedRelationships = relationships
        .map((relationship) => {
          const sourcePerson = peopleById.get(relationship.source_person_id);
          const targetPerson = peopleById.get(relationship.target_person_id);

          if (!sourcePerson || !targetPerson) {
            return null;
          }

          return {
            createdAt: relationship.created_at,
            id: relationship.id,
            relationshipType: relationship.relationship_type as RelationshipType,
            sourcePerson: toContactPreview(
              sourcePerson,
              resolveContactAvatarUrl(
                client,
                user.id,
                {
                  hasAvatar: sourcePerson.has_avatar,
                  id: sourcePerson.id,
                  updatedAt: sourcePerson.updated_at,
                },
                avatarOpts,
              ),
            ),
            sourcePersonId: relationship.source_person_id,
            targetPerson: toContactPreview(
              targetPerson,
              resolveContactAvatarUrl(
                client,
                user.id,
                {
                  hasAvatar: targetPerson.has_avatar,
                  id: targetPerson.id,
                  updatedAt: targetPerson.updated_at,
                },
                avatarOpts,
              ),
            ),
            targetPersonId: relationship.target_person_id,
            updatedAt: relationship.updated_at,
            userId: relationship.user_id,
          };
        })
        .filter(
          (relationship): relationship is NonNullable<typeof relationship> => relationship != null,
        );

      return { relationships: formattedRelationships };
    },
  );

  /**
   * POST /api/contacts/:id/relationships - Create a relationship for a person
   */
  fastify.post(
    "/:id/relationships",
    {
      schema: {
        body: createContactRelationshipInputSchema,
        description: "Create a relationship between two contacts.",
        params: uuidParamSchema,
        response: {
          ...withCreatedResponse(contactRelationshipResponseSchema, "Relationship created"),
          ...conflictResponse,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request, reply) => {
      const { id: sourcePersonId } = request.params;
      const { relatedPersonId, relationshipType } = request.body;
      const { data } = await createRelationship(
        ctx,
        sourcePersonId,
        relatedPersonId,
        relationshipType,
      );
      return reply.status(201).send({ relationship: data.relationship });
    }),
  );

  /**
   * PATCH /api/contacts/:id/relationships/:relationshipId - Update a relationship for a person
   */
  fastify.patch(
    "/:id/relationships/:relationshipId",
    {
      schema: {
        body: updateContactRelationshipInputSchema,
        description: "Update a relationship for a contact.",
        params: contactRelationshipIdParamSchema,
        response: {
          ...withOkResponse(contactRelationshipResponseSchema, "Relationship updated"),
          ...conflictResponse,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      const { id: personId, relationshipId } = request.params;
      const { relatedPersonId, relationshipType } = request.body;
      const { data } = await updateRelationship(
        ctx,
        personId,
        relationshipId,
        relatedPersonId,
        relationshipType,
      );
      return { relationship: data.relationship };
    }),
  );

  /**
   * DELETE /api/contacts/:id/relationships/:relationshipId - Delete a relationship for a person
   */
  fastify.delete(
    "/:id/relationships/:relationshipId",
    {
      schema: {
        description: "Delete a relationship for a contact.",
        params: contactRelationshipIdParamSchema,
        response: withOkResponse(messageResponseSchema, "Relationship deleted"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      const { id: personId, relationshipId } = request.params;
      await deleteRelationship(ctx, personId, relationshipId);
      return { message: "Relationship deleted successfully" };
    }),
  );
}
