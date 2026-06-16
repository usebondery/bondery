/**
 * Chat API Routes
 * Handles AI chat assistant streaming responses
 */

import type { FastifyInstance, FastifyRequest } from "fastify";
import type { UIMessage } from "ai";
import { convertToModelMessages } from "ai";
import type { Json } from "@bondery/types/supabase.types";
import { getAuth } from "../../lib/auth.js";
import { runChatAgent } from "../../lib/chat/agent.js";
import { generateSessionTitle } from "../../lib/chat/title.js";
import { checkAndIncrementQuota } from "../../lib/chat/quota.js";

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Chat"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * POST /api/chat - Stream an AI chat response
   */
  fastify.post(
    "/",
    async (
      request: FastifyRequest<{
        Body: { messages: UIMessage[]; sessionId: string };
      }>,
      reply,
    ) => {
      const { client, user } = getAuth(request);
      const { messages, sessionId } = request.body;

      if (!sessionId) {
        return reply.status(400).send({ error: "sessionId is required" });
      }

      // Atomically check quota and increment the counter in one DB round-trip.
      // If not allowed, abort immediately — the increment is counted but the
      // user's message is not streamed or persisted.
      const quota = await checkAndIncrementQuota(client, user.id);
      if (!quota.allowed) {
        return reply.status(403).send({
          error: "Chat quota exceeded",
          code: "CHAT_QUOTA_EXCEEDED",
          messagesUsed: quota.messagesUsed,
          limit: quota.limit,
          plan: quota.plan,
          resetAt: quota.resetAt,
        });
      }

      const modelMessages = await convertToModelMessages(messages);
      const result = runChatAgent(modelMessages, client, user.id, user.email);

      reply.hijack();
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("x-vercel-ai-ui-message-stream", "v1");

      result.pipeUIMessageStreamToResponse(reply.raw);

      // Persist messages after streaming completes (fire-and-forget)
      const lastUserMessage = messages[messages.length - 1];

      Promise.resolve(result.text)
        .then(async (fullText) => {
          await persistMessages(client, sessionId, lastUserMessage, fullText, request);
          await generateTitleIfNeeded(client, sessionId, lastUserMessage, fullText, request);
        })
        .catch((err: unknown) => {
          request.log.error(err, "Failed to persist chat messages");
        });
    },
  );
}

/**
 * Persist the latest user + assistant messages to the database.
 */
async function persistMessages(
  client: ReturnType<typeof getAuth>["client"],
  sessionId: string,
  userMessage: UIMessage,
  assistantText: string,
  request: any,
) {
  // Extract user message text
  const userText =
    userMessage.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "";

  // Save user message
  const { error: userErr } = await client.from("chat_messages").insert({
    session_id: sessionId,
    role: "user" as const,
    content: { text: userText } as unknown as Json,
  });
  if (userErr) {
    request.log.error(userErr, "Failed to save user message");
  }

  // Save assistant message
  const { error: assistantErr } = await client.from("chat_messages").insert({
    session_id: sessionId,
    role: "assistant" as const,
    content: { text: assistantText } as unknown as Json,
  });
  if (assistantErr) {
    request.log.error(assistantErr, "Failed to save assistant message");
  }

  // Bump session updated_at
  await client
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

/**
 * Generate a title for a session if it doesn't have one yet.
 */
async function generateTitleIfNeeded(
  client: ReturnType<typeof getAuth>["client"],
  sessionId: string,
  userMessage: UIMessage,
  assistantText: string,
  request: any,
) {
  // Check if session already has a title
  const { data: session } = await client
    .from("chat_sessions")
    .select("title")
    .eq("id", sessionId)
    .single();

  if (session?.title) return;

  // Extract text from the user message
  const userText =
    userMessage.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "";

  if (!userText) return;

  try {
    const title = await generateSessionTitle(userText);
    if (title) {
      await client.from("chat_sessions").update({ title }).eq("id", sessionId);
    }
  } catch (err) {
    request.log.error(err, "Title generation failed");
  }
}
