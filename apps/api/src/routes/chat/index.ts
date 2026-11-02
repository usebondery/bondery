/**
 * Chat API Routes
 * Handles AI chat assistant streaming responses
 */

import type { ChatModelId, ChatTurnIntent } from "@bondery/schemas";
import { chatRequestSchema } from "@bondery/schemas";
import { standardErrorResponses } from "@bondery/schemas/http/responses";
import type { UIMessage } from "ai";
import { convertToModelMessages } from "ai";
import type { FastifyRequest } from "fastify";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { domainContextFromRequest } from "../../lib/platform/domain-context.js";
import {
  badRequest,
  forbidden,
  serviceUnavailable,
} from "../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { AI_TIER } from "../../lib/platform/rate-limit.js";
import {
  createChatActivityTracker,
  markWriteInterrupted,
  runChatAgent,
} from "../../services/chat/agent.js";
import {
  hasToolApprovalDecision,
  stripToolPartsForModel,
} from "../../services/chat/message-parts.js";
import { resolveAnthropicApiKey } from "../../services/chat/provider.js";
import { checkAndIncrementQuota } from "../../services/chat/quota.js";
import {
  persistAssistantChatMessage,
  persistUserChatMessage,
  setChatSessionTitleIfEmpty,
} from "../../services/chat/sessions.js";
import { generateSessionTitle } from "../../services/chat/title.js";
import { resolveChatTurn } from "../../services/chat/turn.js";

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
        Body: {
          intent?: ChatTurnIntent;
          messages: UIMessage[];
          model?: ChatModelId;
          sessionId: string;
        };
      }>,
      reply,
    ) => {
      const ctx = domainContextFromRequest(request);
      const { messages, model, sessionId } = request.body;

      // A tool decision is read from the payload, not from a client flag: the
      // SDK resumes the turn as soon as the decision is recorded, so a flag can
      // be one render behind. An explicit intent still wins for a retry.
      const intent: ChatTurnIntent =
        request.body.intent === "retry"
          ? "retry"
          : hasToolApprovalDecision(messages)
            ? "approval"
            : (request.body.intent ?? "message");

      if (!sessionId) {
        throw badRequest("sessionId is required", "bad_request");
      }

      const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
      if (!lastUserMessage) {
        throw badRequest("messages is required", "validation_error");
      }

      const turn = await resolveChatTurn(ctx, sessionId, messages, intent);

      const apiKey = resolveAnthropicApiKey(fastify.config.BONDERY_PRIVATE_ANTHROPIC_API_KEY);
      if (!apiKey) {
        request.log.error("Chat Anthropic API key is missing or still the env example placeholder");
        if (turn.insertUserMessage) {
          await persistUserChatMessage(ctx, sessionId, lastUserMessage);
        }
        throw serviceUnavailable();
      }

      if (turn.chargeQuota) {
        const quota = await checkAndIncrementQuota(ctx);
        if (!quota.allowed) {
          throw forbidden("Chat quota exceeded", "chat_quota_exceeded", {
            limit: quota.limit,
            messagesUsed: quota.messagesUsed,
            plan: quota.plan,
            resetAt: quota.resetAt,
          });
        }
      }

      if (turn.insertUserMessage) {
        await persistUserChatMessage(ctx, sessionId, lastUserMessage);
      }

      const modelMessages = await convertToModelMessages(
        stripToolPartsForModel(messages, { keepApproval: intent === "approval" }),
      ).catch((err: unknown) => {
        request.log.error(err, "Failed to convert chat messages");
        throw badRequest("Invalid chat messages", "validation_error");
      });

      // The browser aborts the fetch on Stop. Propagate that to the model call
      // so a stopped turn does not keep spending tokens.
      const abortController = new AbortController();
      request.raw.on("aborted", () => abortController.abort());
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) {
          abortController.abort();
        }
      });

      const tracker = createChatActivityTracker();
      const result = runChatAgent(modelMessages, ctx, {
        abortSignal: abortController.signal,
        apiKey,
        modelId: model,
        tracker,
      });

      // Persist once. Stop and failure keep the partial text; a normal finish
      // marks the row complete.
      let persisted = false;
      const persistOnce = async (status: "complete" | "incomplete") => {
        if (persisted) {
          return;
        }
        persisted = true;

        let text = tracker.text;
        if (!text) {
          text = await Promise.resolve(result.text).catch(() => "");
        }

        await persistAssistantChatMessage(
          ctx,
          sessionId,
          {
            activities: tracker.activities,
            status,
            text,
            writeMayHaveLanded: tracker.writeInterrupted,
          },
          { reuseIncomplete: turn.reuseAssistantRow },
        );
      };

      const persistAssistant = Promise.resolve(result.text)
        .then(async (fullText) => {
          tracker.text = fullText;
          await persistOnce("complete");

          // A title only belongs to the first turn of a session.
          if (!turn.insertUserMessage) {
            return;
          }

          const userText = lastUserMessage.parts
            ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join(" ");

          if (userText) {
            try {
              const title = await generateSessionTitle(userText, apiKey);
              if (title) {
                await setChatSessionTitleIfEmpty(ctx, sessionId, title);
              }
            } catch (err) {
              request.log.error(err, "Title generation failed");
            }
          }
        })
        .catch((err: unknown) => {
          // A stopped turn rejects the text promise. The partial row is already
          // written by the stream's own end callback.
          if (abortController.signal.aborted) {
            return;
          }

          request.log.error(err, "Failed to persist assistant chat message");
        });

      reply.hijack();
      try {
        await result.pipeUIMessageStreamToResponse(reply.raw, {
          onEnd: ({ isAborted, isCancelled }) => {
            if (!isAborted && !isCancelled) {
              return;
            }

            markWriteInterrupted(tracker);
            void persistOnce("incomplete");
          },
        });
      } catch (err) {
        request.log.error(err, "Chat stream failed");
      }

      void persistAssistant;
    },
  );
};
