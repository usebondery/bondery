import {
  type ChatMessageContent,
  type ChatTurnIntent,
  chatMessageContentSchema,
} from "@bondery/schemas";
import type { UIMessage } from "ai";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { badRequest } from "../../lib/platform/errors/http-errors.js";
import { userMessageText } from "./sessions.js";

/**
 * Decides what a turn is allowed to do before quota is charged.
 *
 * `message` always inserts the user row. `retry` reuses the last user row and
 * is refused once a write landed. `approval` resumes a paused tool and never
 * inserts or charges.
 */

export interface ResolvedChatTurn {
  /** Charge one chat message. */
  chargeQuota: boolean;
  /** Write the user turn to the database. */
  insertUserMessage: boolean;
  /** Replace an incomplete assistant row instead of adding one. */
  reuseAssistantRow: boolean;
}

/** The stored state a continuation is checked against. */
export interface StoredTurnState {
  lastAssistantContent?: unknown;
  lastUserText: string;
  requestUserText: string;
}

function parseContent(content: unknown): ChatMessageContent {
  const parsed = chatMessageContentSchema.safeParse(content);
  return parsed.success ? parsed.data : {};
}

/** True when a stored turn changed CRM data, or may have changed it. */
export function hasWriteActivity(content: unknown): boolean {
  const parsed = parseContent(content);

  if (parsed.writeMayHaveLanded) {
    return true;
  }

  return (parsed.activities ?? []).some((activity) => activity.kind === "write");
}

/**
 * Pure turn rules. Returns the decision, or the reason a continuation cannot
 * run. A stopped or failed reply with no write may be retried; anything that
 * already changed data must get a new message instead.
 */
export function decideChatTurn(
  intent: ChatTurnIntent,
  state: StoredTurnState,
):
  | { decision: ResolvedChatTurn }
  | { reason: "already_changed" | "already_finished" | "text_mismatch" } {
  if (intent === "message") {
    return { decision: { chargeQuota: true, insertUserMessage: true, reuseAssistantRow: false } };
  }

  if (state.lastUserText !== state.requestUserText) {
    return { reason: "text_mismatch" };
  }

  if (hasWriteActivity(state.lastAssistantContent)) {
    return { reason: "already_changed" };
  }

  if (parseContent(state.lastAssistantContent).status === "complete") {
    return { reason: "already_finished" };
  }

  return {
    decision: {
      chargeQuota: intent === "retry",
      insertUserMessage: false,
      reuseAssistantRow: true,
    },
  };
}

/** Last user message in the thread, whether or not it is the final message. */
function findLastUserMessage(messages: UIMessage[]): UIMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      return messages[index];
    }
  }

  return undefined;
}

/**
 * Resolves the turn against the stored session. Throws `400 validation_error`
 * when a retry or approval cannot be served, before any quota is spent.
 */
export async function resolveChatTurn(
  ctx: DomainContext,
  sessionId: string,
  modelMessages: UIMessage[],
  intent: ChatTurnIntent,
): Promise<ResolvedChatTurn> {
  if (intent === "message") {
    return { chargeQuota: true, insertUserMessage: true, reuseAssistantRow: false };
  }

  const lastUserMessage = findLastUserMessage(modelMessages);
  if (!lastUserMessage) {
    throw badRequest("There is no user message to continue", "validation_error");
  }

  const db = domainDb(ctx);
  const [lastUserRow, lastAssistantRow] = await Promise.all([
    db.chatMessage.findFirst({
      orderBy: { createdAt: "desc" },
      select: { content: true },
      where: { role: "user", sessionId },
    }),
    db.chatMessage.findFirst({
      orderBy: { createdAt: "desc" },
      select: { content: true },
      where: { role: "assistant", sessionId },
    }),
  ]);

  if (!lastUserRow) {
    throw badRequest("There is no user message to continue", "validation_error");
  }

  const result = decideChatTurn(intent, {
    lastAssistantContent: lastAssistantRow?.content,
    lastUserText: parseContent(lastUserRow.content).text ?? "",
    requestUserText: userMessageText(lastUserMessage),
  });

  if ("reason" in result) {
    const messages = {
      already_changed: "This reply already changed data",
      already_finished: "This reply already finished",
      text_mismatch: "The request does not match the stored turn",
    } as const;

    throw badRequest(messages[result.reason], "validation_error");
  }

  return result.decision;
}
