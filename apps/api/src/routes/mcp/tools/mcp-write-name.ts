/**
 * Write tools are detected by name so `mcpAuthHandler` can require `mcp:write`
 * without a hand-maintained list.
 *
 * `create_agent_feedback` is the one exception. It changes no CRM data: it
 * sends a defect report to the Bondery team. A Read only token must be able to
 * report a broken read tool, so this name skips the `mcp:write` gate.
 */

const CREATE_UPDATE_DELETE_PATTERN = /^(create|update|delete)_/;
const NON_MUTATING_CREATE_TOOLS = new Set(["create_agent_feedback"]);

export function isMcpWriteToolName(name: string): boolean {
  if (NON_MUTATING_CREATE_TOOLS.has(name)) {
    return false;
  }
  return CREATE_UPDATE_DELETE_PATTERN.test(name);
}
