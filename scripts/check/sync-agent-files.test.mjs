import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { findDrift } from "../dev/sync-agent-files.mjs";

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

  it("reports missing, changed and extra files", () => {
    const source = tree("b-src", { "keep.md": "new", "missing.md": "m" });
    const target = tree("b-dst", { "extra.md": "e", "keep.md": "old" });
    const drift = findDrift(source, target).join("\n");
    assert.match(drift, /missing .*missing\.md/);
    assert.match(drift, /changed .*keep\.md/);
    assert.match(drift, /extra .*extra\.md/);
  });
});
