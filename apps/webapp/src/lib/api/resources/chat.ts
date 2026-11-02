import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { ChatSession, ChatToolActivity } from "@bondery/schemas";
import type { UIMessage } from "ai";
import { normalizePaginatedList } from "@/lib/api/resources/pagination";

export const CHAT_SESSIONS_LIST_PATH = `${API_ROUTES.CHAT_SESSIONS}?limit=50&offset=0`;

export function buildChatSessionMessagesPath(sessionId: string): string {
  return `${API_ROUTES.CHAT_SESSIONS}/${sessionId}/messages`;
}

export interface ChatMessageRow {
  content: { activities?: unknown; status?: unknown; text?: string; writeMayHaveLanded?: unknown };
  createdAt: string;
  id: string;
  role: "user" | "assistant";
}

export type ChatSessionsApiResponse = Record<string, unknown>;

export function parseChatSessions(raw: ChatSessionsApiResponse): ChatSession[] {
  const { items } = normalizePaginatedList<ChatSession, "sessions">(raw, "sessions", 50);
  return items;
}

export type ChatSessionMessagesApiResponse = { messages?: ChatMessageRow[] };

export function parseChatSessionMessages(raw: ChatSessionMessagesApiResponse): ChatMessageRow[] {
  return raw.messages ?? [];
}

/** Activity rows and turn status survive a reload; the text stays a text part. */
export interface ChatMessageActivityRow {
  activities: ChatToolActivity[];
  status?: "complete" | "incomplete";
  writeMayHaveLanded: boolean;
}

export interface ChatHydratedMessage extends UIMessage {
  activity?: ChatMessageActivityRow;
}

/**
 * The stored time of a message.
 *
 * `UIMessage` has no date field, so the row's `createdAt` rides in metadata.
 * Reading it here keeps the value across a reload instead of guessing `now`.
 */
export function messageSentAt(message: UIMessage): Date | undefined {
  const metadata = message.metadata as { createdAt?: unknown } | undefined;
  if (typeof metadata?.createdAt !== "string") {
    return undefined;
  }

  const parsed = new Date(metadata.createdAt);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseActivities(value: unknown): ChatToolActivity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const activities: ChatToolActivity[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const { displayName, kind, tool } = entry as Record<string, unknown>;
    if (typeof tool !== "string" || (kind !== "read" && kind !== "write")) {
      continue;
    }

    activities.push({
      ...(typeof displayName === "string" && displayName
        ? { displayName: displayName.slice(0, 80) }
        : {}),
      kind,
      tool,
    });
  }

  return activities.slice(0, 20);
}

/**
 * Rebuilds UI messages from stored rows.
 *
 * Only the text becomes a part. Tool parts are not recreated, because the SDK
 * would replay them into the next model call. Short activity labels ride
 * beside the message instead.
 */
export function mapChatMessageRowsToUI(rows: ChatMessageRow[]): ChatHydratedMessage[] {
  return rows.map((msg) => {
    const text = msg.content?.text ?? "";
    const activities = parseActivities(msg.content?.activities);
    const status =
      msg.content?.status === "incomplete" || msg.content?.status === "complete"
        ? msg.content.status
        : undefined;

    return {
      ...(msg.role === "assistant"
        ? {
            activity: {
              activities,
              ...(status ? { status } : {}),
              writeMayHaveLanded: msg.content?.writeMayHaveLanded === true,
            },
          }
        : {}),
      content: text,
      createdAt: new Date(msg.createdAt),
      id: msg.id,
      metadata: { createdAt: msg.createdAt },
      parts: [{ text, type: "text" as const }],
      role: msg.role,
    };
  });
}
