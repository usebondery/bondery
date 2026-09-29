export type McpAccessLevel = "full" | "read";

/** Granted MCP access from stored OAuth scopes. Write implies full. */
export function mcpAccessFromScopes(scopes: readonly string[]): McpAccessLevel {
  return scopes.includes("mcp:write") ? "full" : "read";
}
