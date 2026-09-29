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
import { domainContextFromRequest } from "../../../lib/platform/domain-context.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withCreatedResponse, withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { listContactRelationships } from "../../../services/contacts/queries-detail.js";

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

function _isRelationshipType(value: string): value is RelationshipType {
  return RELATIONSHIP_TYPES.includes(value as RelationshipType);
}

export function registerRelationshipRoutes(fastify: AppFastifyInstance): void {
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
      const ctx = domainContextFromRequest(request);
      return listContactRelationships(ctx, request.params.id, extractAvatarOptions(request.query));
    },
  );

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
    withDomainRoute(
      { body: createContactRelationshipInputSchema, params: uuidParamSchema },
      async (ctx, { body, params }, reply) => {
        const { data } = await createRelationship(
          ctx,
          params.id,
          body.relatedPersonId,
          body.relationshipType,
        );
        return reply.status(201).send({ relationship: data.relationship });
      },
    ),
  );

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
    withDomainRoute(
      { body: updateContactRelationshipInputSchema, params: contactRelationshipIdParamSchema },
      async (ctx, { body, params }) => {
        const { data } = await updateRelationship(
          ctx,
          params.id,
          params.relationshipId,
          body.relatedPersonId,
          body.relationshipType,
        );
        return { relationship: data.relationship };
      },
    ),
  );

  fastify.delete(
    "/:id/relationships/:relationshipId",
    {
      schema: {
        description: "Delete a relationship for a contact.",
        params: contactRelationshipIdParamSchema,
        response: withOkResponse(messageResponseSchema, "Relationship deleted"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: contactRelationshipIdParamSchema }, async (ctx, { params }) => {
      await deleteRelationship(ctx, params.id, params.relationshipId);
      return { message: "Relationship deleted successfully" };
    }),
  );
}
