import type { ChatToolActivity, ChatToolKind } from "@bondery/schemas";

/**
 * Reads tool activity from a UI message and groups it for display.
 *
 * Live parts come from the stream. Stored activities come from the assistant
 * message JSON after a reload. Both feed the same list above the answer.
 */

const TOOL_PART_PREFIX = "tool-";
const DYNAMIC_TOOL_PART = "dynamic-tool";

/** `get_*` and `search_*` read. Every other tool writes. */
export function resolveToolKind(toolName: string): ChatToolKind {
  return toolName.startsWith("get_") || toolName.startsWith("search_") ? "read" : "write";
}

interface ToolPartShape {
  approval?: unknown;
  state?: string;
  toolName?: string;
  type: string;
}

export function isToolPart(part: { type: string }): part is ToolPartShape {
  return part.type === DYNAMIC_TOOL_PART || part.type.startsWith(TOOL_PART_PREFIX);
}

export function toolNameFromPart(part: ToolPartShape): string {
  return part.type === DYNAMIC_TOOL_PART
    ? (part.toolName ?? "unknown")
    : part.type.slice(TOOL_PART_PREFIX.length);
}

/** Live tool labels from the stream, in the order the model called them. */
export function collectLiveToolActivities(parts: readonly { type: string }[]): ChatToolActivity[] {
  const activities: ChatToolActivity[] = [];

  for (const part of parts) {
    if (!isToolPart(part)) {
      continue;
    }

    const tool = toolNameFromPart(part);
    activities.push({ kind: resolveToolKind(tool), tool });
  }

  return activities;
}

/** True while a tool call is still running in the live stream. */
export function hasRunningTool(parts: readonly { type: string }[]): boolean {
  return parts.some((part) => {
    if (!isToolPart(part)) {
      return false;
    }
    return part.state === "input-available" || part.state === "input-streaming";
  });
}

export interface PendingApproval {
  approvalId: string;
  toolName: string;
}

/** The tool call waiting for a user decision, if any. */
export function findPendingApproval(
  parts: readonly { type: string }[],
): PendingApproval | undefined {
  for (const part of parts) {
    if (!isToolPart(part) || part.state !== "approval-requested") {
      continue;
    }

    const approval = part.approval as { id?: unknown } | undefined;
    if (typeof approval?.id === "string") {
      return { approvalId: approval.id, toolName: toolNameFromPart(part) };
    }
  }

  return undefined;
}
