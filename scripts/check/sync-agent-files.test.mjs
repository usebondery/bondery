import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { findDrift, prepareClaudeMcp, prepareCursorMcp } from "../dev/sync-agent-files.mjs";

const PLANE_WRAPPER = "scripts/dev/plane-mcp-stdio.mjs";
const MISSING_MISSING_MD_RE = /missing .*missing\.md/;
const CHANGED_KEEP_MD_RE = /changed .*keep\.md/;
const EXTRA_EXTRA_MD_RE = /extra .*extra\.md/;

const root = mkdtempSync(join(tmpdir(), "agent-files-"));
after(() => rmSync(root, { force: true, recursive: true }));

function tree(name, files) {
  const dir = join(root, name);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

describe("findDrift", () => {
  it("passes when the mirror matches", () => {
    const source = tree("a-src", { "x/SKILL.md": "one" });
    const target = tree("a-dst", { "x/SKILL.md": "one" });
    assert.deepEqual(findDrift(source, target), []);
  });

  it("adds type http on Claude remote MCP entries", () => {
    const config = {
      mcpServers: {
        local: { args: ["mcp"], command: "pnx" },
        plane: { url: "https://mcp.plane.so/http/mcp" },
      },
    };
    const out = prepareClaudeMcp(config);
    assert.equal(out.mcpServers.plane.type, "http");
    assert.equal(out.mcpServers.local.type, "stdio");
  });

  it("expands Plane wrapper path for Cursor", () => {
    const config = {
      mcpServers: {
        plane: {
          args: [PLANE_WRAPPER],
          command: "node",
          type: "stdio",
        },
      },
    };
    const out = prepareCursorMcp(config);
    assert.equal(out.mcpServers.plane.args[0], `\${workspaceFolder}/${PLANE_WRAPPER}`);
  });

  it("removes type from Cursor remote MCP entries", () => {
    const config = {
      mcpServers: {
        local: { args: ["mcp"], command: "pnx", type: "stdio" },
        plane: { type: "http", url: "https://mcp.plane.so/http/mcp" },
      },
    };
    const out = prepareCursorMcp(config);
    assert.equal(out.mcpServers.plane.type, undefined);
    assert.equal(out.mcpServers.local.type, "stdio");
  });

  it("reports missing, changed and extra files", () => {
    const source = tree("b-src", { "keep.md": "new", "missing.md": "m" });
    const target = tree("b-dst", { "extra.md": "e", "keep.md": "old" });
    const drift = findDrift(source, target).join("\n");
    assert.match(drift, MISSING_MISSING_MD_RE);
    assert.match(drift, CHANGED_KEEP_MD_RE);
    assert.match(drift, EXTRA_EXTRA_MD_RE);
  });
});
