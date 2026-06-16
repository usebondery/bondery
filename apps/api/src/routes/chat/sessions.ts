/**
 * Chat Session API Routes
 * CRUD for chat sessions and message persistence
 */

import type { FastifyInstance, FastifyRequest } from "fastify";
import { getAuth } from "../../lib/auth.js";

export async function chatSessionRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Chat"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * GET /api/chat/sessions — List user's chat sessions
   */
  fastify.get("/", async (request, reply) => {
    const { client, user } = getAuth(request);

    const { data, error } = await client
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      request.log.error(error, "Failed to list chat sessions");
      return reply.status(500).send({ error: "Failed to list sessions" });
    }

    return reply.send({ data });
  });

  /**
   * POST /api/chat/sessions — Create a new chat session
   */
  fastify.post("/", async (request, reply) => {
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

  /**
   * PATCH /api/chat/sessions/:sessionId — Update session title
   */
  fastify.patch(
    "/:sessionId",
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: { title: string };
      }>,
      reply,
    ) => {
      const { client } = getAuth(request);
      const { sessionId } = request.params;
      const { title } = request.body;

      const { error } = await client.from("chat_sessions").update({ title }).eq("id", sessionId);

      if (error) {
        request.log.error(error, "Failed to update chat session");
        return reply.status(500).send({ error: "Failed to update session" });
      }

      return reply.status(204).send();
    },
  );

  /**
   * DELETE /api/chat/sessions/:sessionId — Delete a session and all its messages
   */
  fastify.delete(
    "/:sessionId",
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply) => {
      const { client } = getAuth(request);
      const { sessionId } = request.params;

      const { error } = await client.from("chat_sessions").delete().eq("id", sessionId);

      if (error) {
        request.log.error(error, "Failed to delete chat session");
        return reply.status(500).send({ error: "Failed to delete session" });
      }

      return reply.status(204).send();
    },
  );

  /**
   * GET /api/chat/sessions/:sessionId/messages — Load all messages for a session
   */
  fastify.get(
    "/:sessionId/messages",
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply) => {
      const { client } = getAuth(request);
      const { sessionId } = request.params;

      const { data, error } = await client
        .from("chat_messages")
        .select("id, session_id, role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        request.log.error(error, "Failed to load chat messages");
        return reply.status(500).send({ error: "Failed to load messages" });
      }

      return reply.send({ data });
    },
  );
}
