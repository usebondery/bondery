import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findViolations,
  isCheckedPath,
  messageLines,
  parseAddedLines,
} from "./check-no-workarounds.mjs";

const line = (text, n = 1, path = "apps/api/src/a.ts") => ({ line: n, path, text });

describe("findViolations", () => {
  it("rejects each banned phrase", () => {
    const phrases = [
      "// workaround for the proxy",
      "// work-around for the proxy",
      "// this is a hack",
      "// hacky but fine",
      "// kludge",
      "// band-aid",
      "// fine for now",
      "// temporary fix",
      "// quick and dirty",
    ];
    for (const text of phrases) {
      assert.equal(findViolations([line(text)]).length, 1, text);
    }
  });

  it("ignores words that only contain a banned one", () => {
    assert.deepEqual(findViolations([line("const shack = 1; // hackathon, whacking")]), []);
  });

  it("ignores the check's own name in wiring", () => {
    const wiring = "run: node scripts/check/check-no-workarounds.mjs --staged";
    assert.deepEqual(findViolations([line(wiring)]), []);
  });

  it("accepts a tracked exception on the same line", () => {
    assert.deepEqual(findViolations([line("// workaround allow-workaround(#123) bug")]), []);
  });

  it("accepts a tracked exception on the line above", () => {
    const lines = [line("// allow-workaround(#42)", 5), line("// workaround for upstream bug", 6)];
    assert.deepEqual(findViolations(lines), []);
  });

  it("rejects an exception without an issue reference", () => {
    assert.equal(findViolations([line("// workaround allow-workaround()")]).length, 1);
    assert.equal(findViolations([line("// workaround allow-workaround(later)")]).length, 1);
  });

  it("does not let an exception cover a non-adjacent line", () => {
    const lines = [line("// allow-workaround(#42)", 5), line("// workaround", 9)];
    assert.equal(findViolations(lines).length, 1);
  });
});

describe("parseAddedLines", () => {
  const diff = [
    "diff --git a/apps/api/src/a.ts b/apps/api/src/a.ts",
    "--- a/apps/api/src/a.ts",
    "+++ b/apps/api/src/a.ts",
    "@@ -10,0 +11,2 @@",
    "+// workaround one",
    "+const ok = 1;",
    "diff --git a/docs/x.mdx b/docs/x.mdx",
    "--- a/docs/x.mdx",
    "+++ b/docs/x.mdx",
    "@@ -1 +1 @@",
    "+workaround in docs is fine",
  ].join("\n");

  it("numbers added lines and drops excluded paths", () => {
    const added = parseAddedLines(diff);
    assert.deepEqual(
      added.map((entry) => [entry.path, entry.line]),
      [
        ["apps/api/src/a.ts", 11],
        ["apps/api/src/a.ts", 12],
      ],
    );
    assert.equal(findViolations(added).length, 1);
  });
});

describe("isCheckedPath", () => {
  it("checks code and skips prose, generated and agent files", () => {
    assert.equal(isCheckedPath("apps/api/src/a.ts"), true);
    assert.equal(isCheckedPath("scripts/dev/supervisor.mjs"), true);
    assert.equal(isCheckedPath("docs/contributing/local-setup.mdx"), false);
    assert.equal(isCheckedPath(".agents/skills/x/SKILL.md"), false);
    assert.equal(isCheckedPath("packages/db/src/generated/prisma/client.ts"), false);
    assert.equal(isCheckedPath("scripts/check/check-no-workarounds.mjs"), false);
  });
});

describe("messageLines", () => {
  it("skips git comment lines", () => {
    const lines = messageLines("fix: root cause\n# a workaround comment from git\nbody");
    assert.deepEqual(findViolations(lines), []);
  });

  it("flags a commit subject", () => {
    assert.equal(findViolations(messageLines("fix: add workaround for hang")).length, 1);
  });
});
