/**
 * MCP tools must be `{create|get|update|delete|search}_{resource}`.
 * create|update|delete must use mcpToolMeta of that kind; get|search are read-only.
 * See `.agents/skills/bondery-api/references/mcp-tools.md`.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCheck } from "../../../scripts/check/check-report.mjs";

const check = createCheck("check-mcp-tool-names");

const toolsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "routes",
  "mcp",
  "tools",
);
const TOOL_NAME_RE = /registerTool\(\s*"([a-z0-9_]+)"/g;
const ALLOWED_NAME_RE = /^(create|get|update|delete|search)_[a-z][a-z0-9_]*$/;
const META_KIND_RE = /mcpToolMeta\(\s*"(create|get|update|delete|search)"/;

for (const entry of readdirSync(toolsDir)) {
  if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) {
    continue;
  }
  const content = readFileSync(join(toolsDir, entry), "utf8");
  const registrations = [...content.matchAll(TOOL_NAME_RE)];
  for (let index = 0; index < registrations.length; index += 1) {
    const match = registrations[index];
    const name = match[1];
    if (!ALLOWED_NAME_RE.test(name)) {
      check.add(
        `${entry}: invalid MCP tool name "${name}" (use create|get|update|delete|search_*)`,
      );
      continue;
    }

    const verb = name.split("_")[0];
    const sliceStart = match.index ?? 0;
    const sliceEnd = registrations[index + 1]?.index ?? content.length;
    const block = content.slice(sliceStart, sliceEnd);
    const meta = block.match(META_KIND_RE);
    if (!meta) {
      check.add(`${entry}: "${name}" is missing mcpToolMeta`);
      continue;
    }
    if (meta[1] !== verb) {
      check.add(`${entry}: "${name}" must use mcpToolMeta("${verb}"), found "${meta[1]}"`);
    }
  }
}

check.ok();
