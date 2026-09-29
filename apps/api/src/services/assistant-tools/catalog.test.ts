import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createChatTools } from "../chat/create-chat-tools.js";
import { ASSISTANT_TOOL_NAMES } from "./catalog.js";

const TOOL_NAME_RE = /registerTool\(\s*"([a-z0-9_]+)"/g;

function mcpRegisteredToolNames(): string[] {
  const toolsDir = join(dirname(fileURLToPath(import.meta.url)), "../../routes/mcp/tools");
  const names: string[] = [];
  for (const entry of readdirSync(toolsDir)) {
    if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) {
      continue;
    }
    const content = readFileSync(join(toolsDir, entry), "utf8");
    for (const match of content.matchAll(TOOL_NAME_RE)) {
      names.push(match[1]);
    }
  }
  return names.toSorted();
}

describe("assistant tool catalog", () => {
  it("matches MCP registerTool names", () => {
    assert.deepEqual(mcpRegisteredToolNames(), [...ASSISTANT_TOOL_NAMES]);
  });

  it("matches in-app chat tool names", () => {
    const tools = createChatTools({
      user: { email: "a@b.c", id: "11111111-1111-4111-8111-111111111111" },
    });
    assert.deepEqual(Object.keys(tools).toSorted(), [...ASSISTANT_TOOL_NAMES]);
  });
});
