import { createInsufficientScopeError } from "better-auth/oauth2";
import type { JWTPayload } from "jose";
import type { DomainContext } from "../../../domains/_shared/context.js";
import { MCP_WRITE_SCOPE } from "../../../lib/auth/index.js";
import { type McpToolRunResult, runMcpTool } from "./json.js";
import { isMcpWriteToolName } from "./mcp-write-name.js";

export { isMcpWriteToolName };

function grantedScopes(claims: JWTPayload): string[] {
  return typeof claims.scope === "string" ? claims.scope.split(" ").filter(Boolean) : [];
}

export function assertMcpWrite(claims: JWTPayload): void {
  if (!grantedScopes(claims).includes(MCP_WRITE_SCOPE)) {
    throw createInsufficientScopeError([MCP_WRITE_SCOPE]);
  }
}

export async function runMcpWriteTool(
  claims: JWTPayload,
  ctx: DomainContext,
  run: () => Promise<McpToolRunResult>,
): Promise<McpToolRunResult> {
  assertMcpWrite(claims);
  return runMcpTool(ctx, run);
}
