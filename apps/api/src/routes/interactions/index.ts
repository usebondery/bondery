/**
 * Interactions API Routes
 * Handles CRUD operations for timeline interactions
 */

import {
  createInteractionInputSchema,
  interactionResponseSchema,
  interactionsListResponseSchema,
  messageResponseSchema,
  updateInteractionInputSchema,
} from "@bondery/schemas";
import {
  avatarTransformQuerySchema,
  interactionsListQuerySchema,
  uuidParamSchema,
} from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import { notFound } from "../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withCreatedResponse, withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";
import {
  createInteraction,
  deleteInteraction,
  loadFormattedInteraction,
  updateInteraction,
} from "../../services/interactions/index.js";
import { listInteractions } from "../../services/interactions/queries.js";

export const interactionRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Interactions"];
    }
  });

  /**
   * GET /api/interactions - List all interactions
   */
  fastify.get(
    "/",
    {
      schema: {
        description: "List interactions with pagination.",
        querystring: interactionsListQuerySchema,
        response: withOkResponse(interactionsListResponseSchema, "Paginated interactions"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      return listInteractions(client, user.id, request.query, request.log);
    },
  );

  /**
   * POST /api/interactions - Create a new interaction
   */
  fastify.post(
    "/",
    {
      schema: {
        body: createInteractionInputSchema,
        description: "Create a new interaction.",
        response: withCreatedResponse(interactionResponseSchema, "Interaction created"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: createInteractionInputSchema }, async (ctx, { body }, reply) => {
      const interaction = await createInteraction(ctx, {
        date: body.date,
        description: body.description,
        participantIds: body.participantIds,
        title: body.title,
        type: body.type,
      });

      reply.status(201);
      return { interaction };
    }),
  );

  /**
   * GET /api/interactions/:id - Get a single interaction
   */
  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get a single interaction by ID.",
        params: uuidParamSchema,
        querystring: avatarTransformQuerySchema,
        response: withOkResponse(interactionResponseSchema, "Interaction details"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      const avatarOptions = extractAvatarOptions(request.query);
      const interaction = await loadFormattedInteraction(client, user.id, id, avatarOptions);

      if (!interaction) {
        throw notFound("Interaction not found", "not_found");
      }

      return { interaction };
    },
  );

  /**
   * PATCH /api/interactions/:id - Update an interaction
   */
  fastify.patch(
    "/:id",
    {
      schema: {
        body: updateInteractionInputSchema,
        description: "Update an interaction by ID.",
        params: uuidParamSchema,
        querystring: avatarTransformQuerySchema,
        response: withOkResponse(interactionResponseSchema, "Updated interaction"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      {
        body: updateInteractionInputSchema,
        params: uuidParamSchema,
        query: avatarTransformQuerySchema,
      },
      async (ctx, { body, params, query }) => {
        const avatarOptions = extractAvatarOptions(query);

        const interaction = await updateInteraction(
          ctx,
          params.id,
          {
            date: body.date,
            description: body.description,
            participantIds: body.participantIds,
            title: body.title,
            type: body.type,
          },
          avatarOptions,
        );

        return { interaction };
      },
    ),
  );

  /**
   * DELETE /api/interactions/:id - Delete an interaction
   */
  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Delete an interaction by ID.",
        params: uuidParamSchema,
        response: withOkResponse(messageResponseSchema, "Interaction deleted successfully"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params }) => {
      await deleteInteraction(ctx, params.id);
      return { message: "Interaction deleted successfully" };
    }),
  );
};
