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
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  parsePagination,
} from "../../lib/data/pagination.js";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withCreatedResponse, withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";
import {
  createChatSession,
  deleteChatSession,
  updateChatSessionTitle,
} from "../../services/chat/sessions.js";

const CHAT_SESSION_SELECT = "id, userId:user_id, title, createdAt:created_at, updatedAt:updated_at";

const CHAT_MESSAGE_SELECT = "id, sessionId:session_id, role, content, createdAt:created_at";

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
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { limit, offset } = parsePagination(request.query);

      const {
        data: sessions,
        error,
        count,
      } = await client
        .from("chat_sessions")
        .select(CHAT_SESSION_SELECT, { count: "exact" })
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        request.log.error(error, "Failed to list chat sessions");
        throw internal("failed_to_list_sessions");
      }

      const items = sessions ?? [];
      const totalCount = typeof count === "number" ? count : items.length;
      const pagination = buildPaginationMeta({
        itemCount: items.length,
        limit,
        offset,
        search: null,
        sort: "updatedAtDesc",
        totalCount,
      });

      return reply.send(buildPaginatedResponse("sessions", items, pagination));
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        description: "Create a new chat session.",
        response: withCreatedResponse(chatSessionCreatedResponseSchema, "Chat session created"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, _request, reply) => {
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
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      const session = await updateChatSessionTitle(
        ctx,
        request.params.sessionId,
        request.body.title,
      );
      return { session };
    }),
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
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request, reply) => {
      await deleteChatSession(ctx, request.params.sessionId);
      return reply.status(204).send(null);
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
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client } = getAuth(request);
      const { sessionId } = request.params;
      const { limit, offset } = parsePagination(request.query);

      const {
        data: messages,
        error,
        count,
      } = await client
        .from("chat_messages")
        .select(CHAT_MESSAGE_SELECT, { count: "exact" })
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        request.log.error(error, "Failed to load chat messages");
        throw internal("failed_to_load_messages");
      }

      const items = messages ?? [];
      const totalCount = typeof count === "number" ? count : items.length;
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
  );
};
