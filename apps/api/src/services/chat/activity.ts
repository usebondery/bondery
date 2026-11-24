/**
 * Tool activity helpers for the chat agent.
 *
 * An activity is the short, human label stored beside the assistant text. It
 * never carries tool arguments, tool results, emails, phones, or notes.
 */

type ChatToolKind = "read" | "write";

interface ChatToolActivity {
  displayName?: string;
  kind: ChatToolKind;
  tool: string;
}

const HARD_DELETE_TOOLS = [
  "delete_contact",
  "delete_group",
  "delete_interaction",
  "delete_relationship",
  "delete_tag",
  "delete_tags",
] as const;

type HardDeleteTool = (typeof HARD_DELETE_TOOLS)[number];

const HARD_DELETE_TOOL_SET: ReadonlySet<string> = new Set(HARD_DELETE_TOOLS);

const DISPLAY_NAME_FIELDS = ["name", "label", "title", "search"] as const;

const MAX_ACTIVITY_COUNT = 20;
const MAX_DISPLAY_NAME_LENGTH = 80;

/** Hard deletes. These pause for a confirm before `execute` runs. */
function isHardDeleteTool(toolName: string): toolName is HardDeleteTool {
  return HARD_DELETE_TOOL_SET.has(toolName);
}

/** `get_*` and `search_*` read. Everything else writes. */
function resolveToolKind(toolName: string): ChatToolKind {
  return toolName.startsWith("get_") || toolName.startsWith("search_") ? "read" : "write";
}

/**
 * Reads one short label from tool input or output. Only the allowlisted string
 * fields are read, so ids, emails, phones, and notes never reach the database.
 */
function resolveToolDisplayName(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  for (const field of DISPLAY_NAME_FIELDS) {
    const value = (payload as Record<string, unknown>)[field];
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      return trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH);
    }
  }

  return undefined;
}

function buildToolActivity(toolName: string, payload: unknown): ChatToolActivity {
  const displayName = resolveToolDisplayName(payload);

  return displayName
    ? { displayName, kind: resolveToolKind(toolName), tool: toolName }
    : { kind: resolveToolKind(toolName), tool: toolName };
}

export type { ChatToolActivity, ChatToolKind, HardDeleteTool };
export {
  buildToolActivity,
  HARD_DELETE_TOOLS,
  isHardDeleteTool,
  MAX_ACTIVITY_COUNT,
  MAX_DISPLAY_NAME_LENGTH,
  resolveToolDisplayName,
  resolveToolKind,
};
