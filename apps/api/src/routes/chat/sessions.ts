/**
 * Chat Session API Routes
 * CRUD for chat sessions and message persistence
 */

import {
  chatMessagesListResponseSchema,
  chatSessionCreatedResponseSchema,
  chatSessionResponseSchema,
  chatSessionsListResponseSchema,
  updateChatSessionBodySchema,
} from "@bondery/schemas";
import {
  chatMessagesQuerySchema,
  chatSessionIdParamSchema,
  paginationQuerySchema,
} from "@bondery/schemas/http";
import { noContentResponse, standardErrorResponses } from "@bondery/schemas/http/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { domainDb } from "../../domains/_shared/domain-db.js";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  parsePagination,
} from "../../lib/data/pagination.js";
import { notFound } from "../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withCreatedResponse, withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";
import {
  createChatSession,
  deleteChatSession,
  toChatMessageDto,
  updateChatSessionTitle,
} from "../../services/chat/sessions.js";

export const chatSessionRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Chat"];
    }
  });

  fastify.get(
    "/",
    {
      schema: {
        description: "List chat sessions for the authenticated user.",
        querystring: paginationQuerySchema,
        response: withOkResponse(chatSessionsListResponseSchema, "Paginated chat sessions"),
        summary: "List chat sessions",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, { request }, reply) => {
      const { limit, offset } = parsePagination(paginationQuerySchema.parse(request.query));
      const db = domainDb(ctx);

      const [sessions, totalCount] = await Promise.all([
        db.chatSession.findMany({
          orderBy: { updatedAt: "desc" },
          skip: offset,
          take: limit,
          where: { userId: ctx.user.id },
        }),
        db.chatSession.count({ where: { userId: ctx.user.id } }),
      ]);

      const items = sessions.map((session) => ({
        createdAt: session.createdAt.toISOString(),
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt.toISOString(),
        userId: session.userId,
      }));

      const pagination = buildPaginationMeta({
        itemCount: items.length,
        limit,
        offset,
        search: null,
        sort: "updatedAtDesc",
        totalCount,
      });

      return reply.send(buildPaginatedResponse("sessions", items, pagination));
    }),
  );

  fastify.post(
    "/",
    {
      schema: {
        description: "Create a new chat session.",
        response: withCreatedResponse(chatSessionCreatedResponseSchema, "Chat session created"),
        summary: "Create a chat session",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, _route, reply) => {
      const session = await createChatSession(ctx);
      reply.status(201);
      return { session };
    }),
  );

  fastify.patch(
    "/:sessionId",
    {
      schema: {
        body: updateChatSessionBodySchema,
        description: "Update a chat session title.",
        params: chatSessionIdParamSchema,
        response: withOkResponse(chatSessionResponseSchema, "Chat session updated"),
        summary: "Rename a chat session",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: updateChatSessionBodySchema, params: chatSessionIdParamSchema },
      async (ctx, { body, params }) => {
        const session = await updateChatSessionTitle(ctx, params.sessionId, body.title);
        return { session };
      },
    ),
  );

  fastify.delete(
    "/:sessionId",
    {
      schema: {
        description: "Delete a chat session and its messages.",
        params: chatSessionIdParamSchema,
        response: {
          ...noContentResponse,
          ...standardErrorResponses,
        },
        summary: "Delete a chat session",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: chatSessionIdParamSchema }, async (ctx, { params }, reply) => {
      await deleteChatSession(ctx, params.sessionId);
      return reply.status(204).send();
    }),
  );

  fastify.get(
    "/:sessionId/messages",
    {
      schema: {
        description: "List messages in a chat session.",
        params: chatSessionIdParamSchema,
        querystring: chatMessagesQuerySchema,
        response: withOkResponse(chatMessagesListResponseSchema, "Paginated chat messages"),
        summary: "List chat messages",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { params: chatSessionIdParamSchema, query: chatMessagesQuerySchema },
      async (ctx, route, reply) => {
        const { sessionId } = route.params;
        const { limit, offset } = parsePagination(route.query);
        const db = domainDb(ctx);

        const session = await db.chatSession.findFirst({
          select: { id: true },
          where: { id: sessionId, userId: ctx.user.id },
        });

        if (!session) {
          throw notFound("Chat session not found", "not_found");
        }

        const [messages, totalCount] = await Promise.all([
          db.chatMessage.findMany({
            orderBy: { createdAt: "asc" },
            skip: offset,
            take: limit,
            where: { sessionId },
          }),
          db.chatMessage.count({ where: { sessionId } }),
        ]);

        const items = messages.map(toChatMessageDto);
        const pagination = buildPaginationMeta({
          itemCount: items.length,
          limit,
          offset,
          search: null,
          sort: "createdAtAsc",
          totalCount,
        });

        return reply.send(buildPaginatedResponse("messages", items, pagination));
      },
    ),
  );
};
