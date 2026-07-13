/**
 * Tags API Routes
 * Handles CRUD operations for tags and tag memberships on contacts
 */

import {
  addContactsToTagResponseSchema,
  createTagInputSchema,
  messageResponseSchema,
  removeContactsFromTagResponseSchema,
  tagMembershipRequestSchema,
  tagMembersListResponseSchema,
  tagResponseSchema,
  tagsListResponseSchema,
  tagUpdateResponseSchema,
  updateTagSchema,
} from "@bondery/schemas";
import {
  idsRequestBodySchema,
  peopleListQuerySchema,
  previewListQuerySchema,
  uuidParamSchema,
} from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import {
  addTagMembers,
  createTag,
  deleteTag,
  removeTagMembers,
  updateTag,
} from "../../domains/tags/index.js";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withCreatedResponse, withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";
import { getTag, listTagMembers, listTags } from "../../services/tags/queries.js";

export const tagRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Tags"];
    }
  });

  fastify.get(
    "/",
    {
      schema: {
        description: "List all tags with contact counts and optional member previews.",
        querystring: previewListQuerySchema,
        response: withOkResponse(tagsListResponseSchema, "Tag list"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      return listTags(client, user.id, request.query);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        body: createTagInputSchema,
        description: "Create a new tag (color auto-assigned).",
        response: withCreatedResponse(tagResponseSchema, "Tag created"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: createTagInputSchema }, async (ctx, { body }, reply) => {
      const { data } = await createTag(ctx, { label: body.label });
      return reply.status(201).send({ tag: data.tag });
    }),
  );

  fastify.delete(
    "/",
    {
      schema: {
        body: idsRequestBodySchema,
        description: "Delete multiple tags by ID.",
        response: withOkResponse(messageResponseSchema, "Tags deleted successfully"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: idsRequestBodySchema }, async (ctx, { body }) => {
      for (const id of body.ids) {
        await deleteTag(ctx, id);
      }
      return { message: "Tags deleted successfully" };
    }),
  );

  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get a single tag by ID.",
        params: uuidParamSchema,
        response: withOkResponse(tagResponseSchema, "Tag details"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      return getTag(client, user.id, id);
    },
  );

  fastify.patch(
    "/:id",
    {
      schema: {
        body: updateTagSchema,
        description: "Update a tag label or color.",
        params: uuidParamSchema,
        response: withOkResponse(tagUpdateResponseSchema, "Tag updated"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: updateTagSchema, params: uuidParamSchema },
      async (ctx, { body, params }) => {
        const { data } = await updateTag(ctx, params.id, {
          color: body.color,
          label: body.label,
        });
        return { tag: data.tag };
      },
    ),
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Delete a single tag by ID.",
        params: uuidParamSchema,
        response: withOkResponse(messageResponseSchema, "Tag deleted successfully"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params }) => {
      await deleteTag(ctx, params.id);
      return { message: "Tag deleted successfully" };
    }),
  );

  fastify.get(
    "/:id/contacts",
    {
      schema: {
        description: "List paginated contacts that have this tag.",
        params: uuidParamSchema,
        querystring: peopleListQuerySchema,
        response: withOkResponse(tagMembersListResponseSchema, "Tag members"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const { id: tagId } = request.params;
      return listTagMembers(client, user.id, tagId, request.query);
    },
  );

  fastify.post(
    "/:id/contacts",
    {
      schema: {
        body: tagMembershipRequestSchema,
        description: "Add contacts to a tag.",
        params: uuidParamSchema,
        response: withOkResponse(addContactsToTagResponseSchema, "Contacts added to tag"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: tagMembershipRequestSchema, params: uuidParamSchema },
      async (ctx, { body, params }) => {
        const { data } = await addTagMembers(ctx, params.id, body.personIds);
        return { addedCount: data.addedCount };
      },
    ),
  );

  fastify.delete(
    "/:id/contacts",
    {
      schema: {
        body: tagMembershipRequestSchema,
        description: "Remove contacts from a tag.",
        params: uuidParamSchema,
        response: withOkResponse(removeContactsFromTagResponseSchema, "Contacts removed from tag"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: tagMembershipRequestSchema, params: uuidParamSchema },
      async (ctx, { body, params }) => {
        const { data } = await removeTagMembers(ctx, params.id, body.personIds);
        return { removedCount: data.removedCount };
      },
    ),
  );
};
