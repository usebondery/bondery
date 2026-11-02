/**
 * Public chat model ids and their Anthropic counterparts.
 *
 * Public ids use the OpenRouter slug form so the name is familiar and stable.
 * Traffic still goes to Anthropic through `createAnthropic`. The client never
 * sends an Anthropic id or a provider path.
 */

/** Public ids accepted on `POST /chat`. */
export const CHAT_MODEL_IDS = [
  "auto",
  "anthropic/claude-haiku-5.5",
  "anthropic/claude-sonnet-5.5",
] as const;

export type ChatModelId = (typeof CHAT_MODEL_IDS)[number];

/**
 * The model a new session starts on. `auto` is the product default and, for
 * now, resolves to the same model as this constant.
 */
export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "auto";

/** The fast model. Used by title generation and by `auto`. */
export const FAST_CHAT_MODEL_ID: ChatModelId = "anthropic/claude-haiku-5.5";

/** Anthropic Messages API ids for each public id. */
const ANTHROPIC_MODEL_BY_ID: Record<ChatModelId, string> = {
  "anthropic/claude-haiku-5.5": "claude-haiku-5-5",
  "anthropic/claude-sonnet-5.5": "claude-sonnet-5-5",
  auto: "claude-haiku-5-5",
};

export function isChatModelId(value: unknown): value is ChatModelId {
  return typeof value === "string" && CHAT_MODEL_IDS.includes(value as ChatModelId);
}

/**
 * Resolves a public id to the Anthropic id. An omitted id is the default.
 * Callers validate the request body first, so an unknown id cannot reach here.
 *
 * `auto` is not routed yet. It stays on the fast model until per-message
 * routing exists.
 */
export function resolveAnthropicModelId(modelId?: ChatModelId): string {
  return ANTHROPIC_MODEL_BY_ID[modelId ?? DEFAULT_CHAT_MODEL_ID];
}
