import type { ChatTurnIntent } from "@bondery/schemas";
import type { UIMessage } from "ai";
import { isToolPart } from "./chatActivity";

/**
 * Picks the turn kind the transport sends.
 *
 * An assistant message with an answered-but-not-run tool is an approval
 * resume. A retry is flagged by the caller, because it starts before the SDK
 * rewrites the message list.
 */
export function resolveRequestIntent(
  messages: readonly UIMessage[],
  isRetry: boolean,
): ChatTurnIntent {
  if (isRetry) {
    return "retry";
  }

  const lastMessage = messages[messages.length - 1];
  const hasApprovalResponse =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (part) =>
        isToolPart(part) &&
        (part as { state?: string }).state === "approval-responded" &&
        (part as { output?: unknown }).output === undefined,
    );

  return hasApprovalResponse ? "approval" : "message";
}
