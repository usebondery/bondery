/**
 * Groups API Routes
 * Handles CRUD operations for groups and group memberships
 */

import {
  createGroupSchema,
  groupResponseSchema,
  groupsListResponseSchema,
  messageResponseSchema,
  updateGroupSchema,
} from "@bondery/schemas";
import {
  idsRequestBodySchema,
  previewListQuerySchema,
  uuidParamSchema,
} from "@bondery/schemas/http";
import { createGroup, deleteGroup, updateGroup } from "../../domains/groups/index.js";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin, FastifyZodOpenApiSchema } from "../../lib/platform/fastify-types.js";
import { withCreatedResponse, withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";
import { getGroup, listGroups } from "../../services/groups/queries.js";
import { registerGroupContactRoutes } from "./contacts.js";

export const groupRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Groups"];
    }
  });

  fastify.get(
    "/",
    {
      schema: {
        description: "List all groups with contact counts and optional member previews.",
        querystring: previewListQuerySchema,
        response: withOkResponse(groupsListResponseSchema, "Group list"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      return listGroups(client, user.id, request.query);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        body: createGroupSchema,
        description: "Create a new group.",
        response: withCreatedResponse(groupResponseSchema, "Group created"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: createGroupSchema }, async (ctx, { body }, reply) => {
      const { data } = await createGroup(ctx, {
        color: body.color,
        emoji: body.emoji,
        label: body.label,
      });
      return reply.status(201).send({ group: data.group });
    }),
  );

  fastify.delete(
    "/",
    {
      schema: {
        body: idsRequestBodySchema,
        description: "Delete multiple groups by ID.",
        response: withOkResponse(messageResponseSchema, "Groups deleted successfully"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: idsRequestBodySchema }, async (ctx, { body }) => {
      for (const id of body.ids) {
        await deleteGroup(ctx, id);
      }
      return { message: "Groups deleted successfully" };
    }),
  );

  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get a single group by ID.",
        params: uuidParamSchema,
        response: withOkResponse(groupResponseSchema, "Group details"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      return getGroup(client, user.id, id);
    },
  );

  fastify.patch(
    "/:id",
    {
      schema: {
        body: updateGroupSchema,
        description: "Update a group by ID.",
        params: uuidParamSchema,
        response: withOkResponse(groupResponseSchema, "Updated group"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: updateGroupSchema, params: uuidParamSchema },
      async (ctx, { body, params }) => {
        const { data } = await updateGroup(ctx, params.id, {
          color: body.color,
          emoji: body.emoji,
          label: body.label,
        });
        return { group: data.group };
      },
    ),
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Delete a single group by ID.",
        params: uuidParamSchema,
        response: withOkResponse(messageResponseSchema, "Group deleted successfully"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params }) => {
      await deleteGroup(ctx, params.id);
      return { message: "Group deleted successfully" };
    }),
  );

  registerGroupContactRoutes(fastify);
};
