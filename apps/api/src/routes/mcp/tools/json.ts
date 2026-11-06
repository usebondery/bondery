import { randomUUID } from "node:crypto";
import {
  type CallToolResult,
  type InputRequiredResult,
  isInputRequiredResult,
} from "@modelcontextprotocol/server";
import { isInsufficientScopeError } from "better-auth/oauth2";
import type { DomainContext } from "../../../domains/_shared/context.js";
import { toAgentToolErrorResponse } from "../../../lib/platform/errors/to-api-error-response.js";

export type McpToolRunResult = CallToolResult | InputRequiredResult;

export function mcpJsonResult(value: unknown, isError = false): CallToolResult {
  if (isInputRequiredResult(value)) {
    throw new TypeError("input_required must be returned, not wrapped as JSON");
  }
  return {
    content: [{ text: JSON.stringify(value), type: "text" }],
    isError,
    structuredContent:
      typeof value === "object" && value !== null ? (value as Record<string, unknown>) : { value },
  };
}

/**
 * Runs a tool body and converts any failure to the agent-facing error envelope.
 *
 * A failure answers WHAT, WHY, and HOW plus `doc_url`, so the model can repair
 * the call without a human. REST keeps the bare message — only agent surfaces
 * get the recovery step.
 *
 * Argument validation runs inside the SDK, before this function. The HTTP
 * layer converts those failures instead; see `tool-error-response.ts`.
 */
export async function runMcpTool(
  ctx: DomainContext,
  run: () => Promise<McpToolRunResult>,
): Promise<McpToolRunResult> {
  const requestId = ctx.requestId ?? randomUUID();
  try {
    const result = await run();
    if (isInputRequiredResult(result)) {
      return result;
    }
    return result;
  } catch (error) {
    if (isInsufficientScopeError(error)) {
      throw error;
    }
    return mcpJsonResult(toAgentToolErrorResponse(error, requestId), true);
  }
}
