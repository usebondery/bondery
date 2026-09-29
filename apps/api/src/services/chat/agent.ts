import type { ServerResponse } from "node:http";
import { isStepCount, type ModelMessage, streamText } from "ai";
import type { DomainContext } from "../../domains/_shared/context.js";
import { createChatTools } from "./create-chat-tools.js";
import { getChatModel } from "./provider.js";
import { buildChatSystemPrompt } from "./system-prompt.js";

/**
 * Runs the AI chat agent with the given messages and domain context.
 * Returns a streaming text response using the Vercel AI SDK.
 */
export function runChatAgent(
  messages: ModelMessage[],
  ctx: DomainContext,
  apiKey?: string,
): {
  pipeUIMessageStreamToResponse: (response: ServerResponse) => Promise<void>;
  text: PromiseLike<string>;
} {
  const today = new Date().toISOString().split("T")[0];

  return streamText({
    instructions: buildChatSystemPrompt({ myselfPersonId: ctx.user.id, today }),
    messages,
    model: getChatModel(apiKey),
    stopWhen: isStepCount(10),
    tools: createChatTools(ctx),
  });
}
