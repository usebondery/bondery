import { createAnthropic } from "@ai-sdk/anthropic";
import type { ChatModelId } from "./models.js";
import { resolveAnthropicModelId } from "./models.js";

/**
 * Real Anthropic keys are `sk-ant-api03-…` and much longer than the env
 * example `sk-ant-<your-anthropic-api-key>`. Health only checks non-empty.
 */
const MIN_ANTHROPIC_API_KEY_LENGTH = 40;

export function resolveAnthropicApiKey(configValue: string | undefined): string | undefined {
  const key = (configValue ?? process.env.BONDERY_PRIVATE_ANTHROPIC_API_KEY ?? "").trim();
  if (key.length < MIN_ANTHROPIC_API_KEY_LENGTH) {
    return undefined;
  }
  return key;
}

/**
 * Creates the LLM provider instance for the chat agent.
 * Uses Anthropic Claude, abstracted via AI SDK for easy swapping.
 *
 * `modelId` is the public chat model id. An omitted id stays on the default,
 * so title generation and old clients keep the cheap model.
 *
 * @returns An AI SDK-compatible language model.
 */
export function getChatModel(
  apiKey = process.env.BONDERY_PRIVATE_ANTHROPIC_API_KEY,
  modelId?: ChatModelId,
) {
  const anthropic = createAnthropic({
    apiKey,
  });

  return anthropic(resolveAnthropicModelId(modelId));
}
