import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * Creates the LLM provider instance for the chat agent.
 * Uses Anthropic Claude, abstracted via AI SDK for easy swapping.
 *
 * @returns An AI SDK-compatible language model.
 */
export function getChatModel() {
  const anthropic = createAnthropic({
    apiKey: process.env.PRIVATE_ANTHROPIC_API_KEY,
  });

  return anthropic("claude-haiku-4-5");
}
