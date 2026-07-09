/**
 * Chat API Routes
 * Handles AI chat assistant streaming responses
 */

import { chatRequestSchema } from "@bondery/schemas";
import { standardErrorResponses } from "@bondery/schemas/http/responses";
import type { UIMessage } from "ai";
import { convertToModelMessages } from "ai";
import type { FastifyRequest } from "fastify";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import { domainContextFromRequest } from "../../lib/platform/domain-context.js";
import { badRequest, forbidden } from "../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { AI_TIER } from "../../lib/platform/rate-limit.js";
import { runChatAgent } from "../../services/chat/agent.js";
import { checkAndIncrementQuota } from "../../services/chat/quota.js";
import { persistChatMessages, setChatSessionTitleIfEmpty } from "../../services/chat/sessions.js";
import { generateSessionTitle } from "../../services/chat/title.js";

export const chatRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Chat"];
    }
  });

  /**
   * POST /api/chat - Stream an AI chat response
   */
  fastify.post(
    "/",
    {
      config: { rateLimit: AI_TIER },
      schema: {
        body: chatRequestSchema,
        description: "Stream an AI chat assistant response as Server-Sent Events.",
        response: {
          200: {
            content: {
              "text/event-stream": {
                schema: z.string(),
              },
            },
            description: "UI message event stream (text/event-stream)",
          },
          ...standardErrorResponses,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    async (
      request: FastifyRequest<{
        Body: { messages: UIMessage[]; sessionId: string };
      }>,
      reply,
    ) => {
      const { client, user } = getAuth(request);
      const { messages, sessionId } = request.body;

      if (!sessionId) {
        throw badRequest("sessionId is required", "bad_request");
      }

      // Atomically check quota and increment the counter in one DB round-trip.
      // If not allowed, abort immediately — the increment is counted but the
      // user's message is not streamed or persisted.
      const quota = await checkAndIncrementQuota(client, user.id);
      if (!quota.allowed) {
        throw forbidden("Chat quota exceeded", "chat_quota_exceeded", {
          limit: quota.limit,
          messagesUsed: quota.messagesUsed,
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
          const ctx = domainContextFromRequest(request);
          await persistChatMessages(ctx, sessionId, lastUserMessage, fullText);
          const userText =
            lastUserMessage.parts
              ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join(" ") ?? "";
          if (userText) {
            try {
              const title = await generateSessionTitle(userText);
              if (title) {
                await setChatSessionTitleIfEmpty(ctx, sessionId, title);
              }
            } catch (err) {
              request.log.error(err, "Title generation failed");
            }
          }
        })
        .catch((err: unknown) => {
          request.log.error(err, "Failed to persist chat messages");
        });
    },
  );
};
