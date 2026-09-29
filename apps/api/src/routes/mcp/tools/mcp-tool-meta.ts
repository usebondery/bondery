import type { ToolAnnotations } from "@modelcontextprotocol/server";

export type McpToolKind = "create" | "delete" | "get" | "search" | "update";

type McpToolHints = Pick<
  ToolAnnotations,
  "destructiveHint" | "idempotentHint" | "openWorldHint" | "readOnlyHint"
>;

const HINTS: Record<McpToolKind, Required<McpToolHints>> = {
  create: {
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
    readOnlyHint: false,
  },
  delete: {
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
    readOnlyHint: false,
  },
  get: {
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  search: {
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
  },
  update: {
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: false,
  },
};

/** Title plus all four ToolAnnotations hints for `registerTool`. */
export function mcpToolMeta(
  kind: McpToolKind,
  title: string,
): { annotations: Required<McpToolHints>; title: string } {
  return {
    annotations: HINTS[kind],
    title,
  };
}
