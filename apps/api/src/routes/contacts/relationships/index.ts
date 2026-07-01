/**
 * Contacts — Relationship Routes
 * Handles creation, retrieval, and deletion of relationships between contacts.
 */

import type { FastifyReply } from "fastify";
import type { AppFastifyInstance } from "../../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../../lib/auth.js";
import { withCreatedResponse, withOkResponse } from "../../../lib/openapi-route-responses.js";
import { conflictResponse } from "@bondery/schemas/http";
import { resolveContactAvatarUrl } from "../../../lib/supabase.js";
import type { RelationshipType } from "@bondery/schemas";
import {
  contactRelationshipResponseSchema,
  contactRelationshipsResponseSchema,
  createContactRelationshipInputSchema,
  messageResponseSchema,
  updateContactRelationshipInputSchema,
} from "@bondery/schemas";
import { extractAvatarOptions } from "../../../lib/queries.js";
import {
  avatarTransformQuerySchema,
  contactRelationshipIdParamSchema,
  uuidParamSchema,
} from "@bondery/schemas/http";

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

function isRelationshipType(value: string): value is RelationshipType {
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
    id: person.id,
    firstName: person.first_name,
    lastName: person.last_name,
    avatar: avatarUrl,
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
    async (request, reply) => {
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
        return reply.status(404).send({ error: "Contact not found" });
      }

      const { data: rows, error: rowsError } = await client
        .from("people_relationships")
        .select(RELATIONSHIP_SELECT)
        .or(`source_person_id.eq.${personId},target_person_id.eq.${personId}`)
        .order("created_at", { ascending: true });

      if (rowsError) {
        return reply.status(500).send({ error: rowsError.message });
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
        return reply.status(500).send({ error: peopleError.message });
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
            id: relationship.id,
            userId: relationship.user_id,
            sourcePersonId: relationship.source_person_id,
            targetPersonId: relationship.target_person_id,
            relationshipType: relationship.relationship_type as RelationshipType,
            createdAt: relationship.created_at,
            updatedAt: relationship.updated_at,
            sourcePerson: toContactPreview(
              sourcePerson,
              resolveContactAvatarUrl(
                client,
                user.id,
                {
                  id: sourcePerson.id,
                  hasAvatar: sourcePerson.has_avatar,
                  updatedAt: sourcePerson.updated_at,
                },
                avatarOpts,
              ),
            ),
            targetPerson: toContactPreview(
              targetPerson,
              resolveContactAvatarUrl(
                client,
                user.id,
                {
                  id: targetPerson.id,
                  hasAvatar: targetPerson.has_avatar,
                  updatedAt: targetPerson.updated_at,
                },
                avatarOpts,
              ),
            ),
          };
        })
        .filter((relationship): relationship is NonNullable<typeof relationship> =>
          relationship != null,
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
        description: "Create a relationship between two contacts.",
        params: uuidParamSchema,
        body: createContactRelationshipInputSchema,
        response: {
          ...withCreatedResponse(contactRelationshipResponseSchema, "Relationship created"),
          ...conflictResponse,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id: sourcePersonId } = request.params;
      const { relatedPersonId, relationshipType } = request.body;
      const normalizedRelatedPersonId = relatedPersonId.trim();

      if (sourcePersonId === normalizedRelatedPersonId) {
        return reply.status(400).send({ error: "A contact cannot be related to itself" });
      }

      const { data: peopleRows, error: peopleError } = await client
        .from("people")
        .select("id")
        .in("id", [sourcePersonId, normalizedRelatedPersonId])
        .eq("user_id", user.id);

      if (peopleError) {
        return reply.status(500).send({ error: peopleError.message });
      }

      if (!peopleRows || peopleRows.length !== 2) {
        return reply.status(404).send({ error: "One or both contacts were not found" });
      }

      const { data: insertedRelationship, error: insertError } = await client
        .from("people_relationships")
        .insert({
          user_id: user.id,
          source_person_id: sourcePersonId,
          target_person_id: normalizedRelatedPersonId,
          relationship_type: relationshipType,
        })
        .select(RELATIONSHIP_SELECT)
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return reply.status(409).send({ error: "Relationship already exists" });
        }

        if (insertError.code === "23514") {
          return reply.status(400).send({ error: "Invalid relationship data" });
        }

        return reply.status(500).send({ error: insertError.message });
      }

      return reply.status(201).send({
        relationship: {
          id: insertedRelationship.id,
          userId: insertedRelationship.user_id,
          sourcePersonId: insertedRelationship.source_person_id,
          targetPersonId: insertedRelationship.target_person_id,
          relationshipType: insertedRelationship.relationship_type as RelationshipType,
          createdAt: insertedRelationship.created_at,
          updatedAt: insertedRelationship.updated_at,
        },
      });
    },
  );

  /**
   * PATCH /api/contacts/:id/relationships/:relationshipId - Update a relationship for a person
   */
  fastify.patch(
    "/:id/relationships/:relationshipId",
    {
      schema: {
        description: "Update a relationship for a contact.",
        params: contactRelationshipIdParamSchema,
        body: updateContactRelationshipInputSchema,
        response: {
          ...withOkResponse(contactRelationshipResponseSchema, "Relationship updated"),
          ...conflictResponse,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id: personId, relationshipId } = request.params;
      const { relatedPersonId, relationshipType } = request.body;
      const normalizedRelatedPersonId = relatedPersonId.trim();

      if (personId === normalizedRelatedPersonId) {
        return reply.status(400).send({ error: "A contact cannot be related to itself" });
      }

      const { data: existingRelationship, error: existingRelationshipError } = await client
        .from("people_relationships")
        .select("id, source_person_id, target_person_id")
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .single();

      if (existingRelationshipError || !existingRelationship) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      if (
        existingRelationship.source_person_id !== personId &&
        existingRelationship.target_person_id !== personId
      ) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      const { data: peopleRows, error: peopleError } = await client
        .from("people")
        .select("id")
        .in("id", [personId, normalizedRelatedPersonId])
        .eq("user_id", user.id);

      if (peopleError) {
        return reply.status(500).send({ error: peopleError.message });
      }

      if (!peopleRows || peopleRows.length !== 2) {
        return reply.status(404).send({ error: "One or both contacts were not found" });
      }

      const { data: updatedRelationship, error: updateError } = await client
        .from("people_relationships")
        .update({
          source_person_id: personId,
          target_person_id: normalizedRelatedPersonId,
          relationship_type: relationshipType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .select(RELATIONSHIP_SELECT)
        .single();

      if (updateError) {
        if (updateError.code === "23505") {
          return reply.status(409).send({ error: "Relationship already exists" });
        }

        if (updateError.code === "23514") {
          return reply.status(400).send({ error: "Invalid relationship data" });
        }

        return reply.status(500).send({ error: updateError.message });
      }

      return {
        relationship: {
          id: updatedRelationship.id,
          userId: updatedRelationship.user_id,
          sourcePersonId: updatedRelationship.source_person_id,
          targetPersonId: updatedRelationship.target_person_id,
          relationshipType: updatedRelationship.relationship_type as RelationshipType,
          createdAt: updatedRelationship.created_at,
          updatedAt: updatedRelationship.updated_at,
        },
      };
    },
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
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id: personId, relationshipId } = request.params;

      const { data: existingRelationship, error: existingRelationshipError } = await client
        .from("people_relationships")
        .select("id, source_person_id, target_person_id")
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .single();

      if (existingRelationshipError || !existingRelationship) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      if (
        existingRelationship.source_person_id !== personId &&
        existingRelationship.target_person_id !== personId
      ) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      const { data: deletedRelationship, error: deleteError } = await client
        .from("people_relationships")
        .delete()
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (deleteError || !deletedRelationship) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      return { message: "Relationship deleted successfully" };
    },
  );
}
