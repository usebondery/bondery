import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { parsePlaneEnvFile } from "../dev/plane-mcp-env.mjs";

describe("parsePlaneEnvFile", () => {
  const dir = mkdtempSync(join(tmpdir(), "plane-mcp-env-"));
  after(() => rmSync(dir, { force: true, recursive: true }));

  it("loads API key and workspace slug", () => {
    const path = join(dir, "plane.env.local");
    writeFileSync(path, "# comment\nPLANE_API_KEY=pat_test\nPLANE_WORKSPACE_SLUG=bondery\n");
    const result = parsePlaneEnvFile(path);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.env.PLANE_API_KEY, "pat_test");
    assert.equal(result.env.PLANE_WORKSPACE_SLUG, "bondery");
  });

  it("maps PLANE_PAT to PLANE_API_KEY", () => {
    const path = join(dir, "pat-only.env");
    writeFileSync(path, "PLANE_PAT=from_pat\nPLANE_WORKSPACE_SLUG=ws\n");
    const result = parsePlaneEnvFile(path);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.env.PLANE_API_KEY, "from_pat");
  });
});
