import { randomUUID } from "node:crypto";
import {
  type CallToolResult,
  type InputRequiredResult,
  isInputRequiredResult,
} from "@modelcontextprotocol/server";
import { isInsufficientScopeError } from "better-auth/oauth2";
import type { DomainContext } from "../../../domains/_shared/context.js";
import { toApiErrorResponse } from "../../../lib/platform/errors/to-api-error-response.js";

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
    return mcpJsonResult(toApiErrorResponse(error, requestId), true);
  }
}
