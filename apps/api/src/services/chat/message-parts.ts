import type { UIMessage } from "ai";

/**
 * Prepares the client's UI messages for the model call.
 *
 * The browser keeps live tool parts during a turn, and the SDK sends them back
 * on later requests. Only an approval turn needs them: the SDK reads
 * `tool-approval-response` content to resume the paused step. Every other turn
 * sends text only, so a client cannot replay a tool result into the model and a
 * reloaded thread behaves the same as a live one.
 */

const TOOL_PART_PREFIX = "tool-";
const DYNAMIC_TOOL_PART = "dynamic-tool";

function isToolPart(part: { type: string }): boolean {
  return part.type === DYNAMIC_TOOL_PART || part.type.startsWith(TOOL_PART_PREFIX);
}

function isToolOrReasoningPart(part: { type: string }): boolean {
  return isToolPart(part) || part.type === "reasoning" || part.type.startsWith("reasoning-");
}

function stripParts(message: UIMessage): UIMessage {
  return { ...message, parts: message.parts.filter((part) => !isToolOrReasoningPart(part)) };
}

function hasApprovalPart(message: UIMessage): boolean {
  return message.parts.some(
    (part) => isToolPart(part) && (part as { approval?: unknown }).approval,
  );
}

/** The newest assistant message that carries a tool decision. */
function findApprovalMessageIndex(messages: UIMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant" && hasApprovalPart(message)) {
      return index;
    }
  }

  return -1;
}

/**
 * Removes tool, approval, and reasoning parts before `convertToModelMessages`.
 *
 * When `keepApproval` is true, the assistant message that holds the tool
 * decision keeps its parts so the SDK can resume the paused step. Every other
 * message is stripped.
 */
export function stripToolPartsForModel(
  messages: UIMessage[],
  { keepApproval = false }: { keepApproval?: boolean } = {},
): UIMessage[] {
  if (!keepApproval) {
    return messages.map(stripParts);
  }

  const keepIndex = findApprovalMessageIndex(messages);

  return messages.map((message, index) => (index === keepIndex ? message : stripParts(message)));
}

/** True when the last assistant message carries a tool part awaiting a decision. */
export function hasPendingToolApproval(messages: UIMessage[]): boolean {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role !== "assistant") {
    return false;
  }

  return lastMessage.parts.some(
    (part) => isToolPart(part) && (part as { state?: string }).state === "approval-requested",
  );
}

/**
 * True when the client posted a decision for a paused tool.
 *
 * The server reads this from the payload instead of trusting a flag, because
 * the SDK resumes a turn as soon as the decision is recorded. A client-side
 * flag can be one render behind at that moment.
 */
export function hasToolApprovalDecision(messages: UIMessage[]): boolean {
  return messages.some(
    (message) =>
      message.role === "assistant" &&
      message.parts.some(
        (part) =>
          isToolPart(part) &&
          (part as { approval?: { approved?: unknown } }).approval?.approved != null,
      ),
  );
}
