/**
 * Chat Session API Routes
 * CRUD for chat sessions and message persistence
 */

import type { AppRoutePlugin } from "../../lib/fastify-types";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { getAuth } from "../../lib/auth";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta";
import {
  withCreatedResponse,
  withOkResponse,
} from "../../lib/openapi-route-responses";
import {
  chatMessagesListResponseSchema,
  paginationMetaSchema,
  EXAMPLE_CHAT_SESSION_CREATED_RESPONSE,
  EXAMPLE_CHAT_SESSIONS_WIRE_LIST_RESPONSE,
} from "@bondery/schemas";
import { noContentResponse, standardErrorResponses } from "@bondery/schemas/http";
import {
  chatMessagesQuerySchema,
  chatSessionIdParamSchema,
  paginationQuerySchema,
} from "@bondery/schemas/http";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  parsePagination,
} from "../../lib/pagination";

const chatSessionListItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

const chatSessionsListResponseWireSchema = z
  .object({
    sessions: z.array(chatSessionListItemSchema),
    pagination: paginationMetaSchema,
  })
  .meta({ example: EXAMPLE_CHAT_SESSIONS_WIRE_LIST_RESPONSE });

const updateChatSessionBodySchema = z.object({
  title: z.string(),
});

const chatSessionCreatedResponseSchema = z
  .object({
    data: z.object({
      id: z.string(),
      created_at: z.string().nullable(),
    }),
  })
  .meta({ example: EXAMPLE_CHAT_SESSION_CREATED_RESPONSE });

export const chatSessionRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Chat"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.get(
    "/",
    {
      schema: {
        description: "List chat sessions for the authenticated user.",
        querystring: paginationQuerySchema,
        response: withOkResponse(chatSessionsListResponseWireSchema, "Paginated chat sessions"),
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
        .select("id, title, created_at, updated_at", { count: "exact" })
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        request.log.error(error, "Failed to list chat sessions");
        return reply.status(500).send({ error: "Failed to list sessions" });
      }

      const items = sessions ?? [];
      const totalCount = typeof count === "number" ? count : items.length;
      const pagination = buildPaginationMeta({
        limit,
        offset,
        totalCount,
        itemCount: items.length,
        sort: "updatedAtDesc",
        search: null,
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
    async (request, reply) => {
    const { client, user } = getAuth(request);

    const { data, error } = await client
      .from("chat_sessions")
      .insert({ user_id: user.id })
      .select("id, created_at")
      .single();

    if (error) {
      request.log.error(error, "Failed to create chat session");
      return reply.status(500).send({ error: "Failed to create session" });
    }

    return reply.status(201).send({ data });
  });

  fastify.patch(
    "/:sessionId",
    {
      schema: {
        description: "Update a chat session title.",
        params: chatSessionIdParamSchema,
        body: updateChatSessionBodySchema,
        response: {
          ...noContentResponse,
          ...standardErrorResponses,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client } = getAuth(request);
      const { sessionId } = request.params;
      const { title } = request.body;

      const { error } = await client.from("chat_sessions").update({ title }).eq("id", sessionId);

      if (error) {
        request.log.error(error, "Failed to update chat session");
        return reply.status(500).send({ error: "Failed to update session" });
      }

      return reply.status(204).send(null);
    },
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
    async (request, reply) => {
      const { client } = getAuth(request);
      const { sessionId } = request.params;

      const { error } = await client.from("chat_sessions").delete().eq("id", sessionId);

      if (error) {
        request.log.error(error, "Failed to delete chat session");
        return reply.status(500).send({ error: "Failed to delete session" });
      }

      return reply.status(204).send(null);
    },
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
        .select("id, session_id, role, content, created_at", { count: "exact" })
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        request.log.error(error, "Failed to load chat messages");
        return reply.status(500).send({ error: "Failed to load messages" });
      }

      const items = messages ?? [];
      const totalCount = typeof count === "number" ? count : items.length;
      const pagination = buildPaginationMeta({
        limit,
        offset,
        totalCount,
        itemCount: items.length,
        sort: "createdAtAsc",
        search: null,
      });

      return reply.send(buildPaginatedResponse("messages", items, pagination));
    },
  );
}

