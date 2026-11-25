import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { main, nextVersion, summarize } from "./changelog.mjs";

const RE_1 = /not a real date/;
const RE_2 = /^---\ntitle: "1\.11\.5"\ndescription: Bondery 1\.11\.5 /;
const RE_3 = /last_updated: 2026-11-26\n---\n\n## \[1\.11\.5\] - 26\.11\.2026\n\n### 🔄 Changed/;
const RE_4 = /- Webapp: a fix\.\n$/;
const RE_5 = /already exists/;
const RE_6 = /empty/;
const RE_7 = /clean calendar version/;
const RE_8 = /140 to 160/;
const RE_9 = /must start with "Bondery 1\.11\.5"/;
const RE_10 = /^description: "Bondery 1\.11\.5 .*and: removes/m;
const RE_11 = /2\t🔄 Changed\n1\t🐛 Fixed\nNext version for 2026-11-26: 1\.11\.5/;

const DESCRIPTION =
  "Bondery 1.11.5 moves the Traefik storage client certificate into its own folder, and removes the old flat files on the next deploy of a stack.";

const UNRELEASED = `---
title: "Changelog Unreleased"
hidden: true
last_updated: 2026-11-25
---

## [Unreleased]

### 🔄 Changed

- Self-host: the transport job keeps certificates in one folder.
- API: a second entry.

### 🐛 Fixed

- Webapp: a fix.
`;

function fixture(unreleased = UNRELEASED) {
  const root = mkdtempSync(join(tmpdir(), "bondery-changelog-"));
  const dir = join(root, "docs", "changelog");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "unreleased.mdx"), unreleased);
  for (const version of ["1.11.3", "1.11.4", "1.10.2"]) {
    writeFileSync(join(dir, `${version}.mdx`), "x");
  }
  writeFileSync(
    join(dir, "meta.json"),
    `${JSON.stringify({ icon: "History", pages: ["1.11.4", "1.11.3", "1.10.2"], title: "Changelog" }, null, 2)}\n`,
  );
  return { dir, root };
}

function run(root, args, now = new Date(2026, 10, 26)) {
  const lines = [];
  const push = (line) => {
    lines.push(line);
  };
  const code = main(args, { fail: push, log: push, now, root });
  return { code, out: lines.join("\n") };
}

describe("nextVersion", () => {
  it("starts a month at patch 0", () => {
    assert.equal(nextVersion(["1.11.4"], "2026-12-02"), "1.12.0");
  });

  it("continues the month after its highest patch, not its count", () => {
    assert.equal(nextVersion(["1.11.0", "1.11.4", "1.11.3"], "2026-11-26"), "1.11.5");
  });

  it("counts years from 2025", () => {
    assert.equal(nextVersion([], "2027-01-05"), "2.1.0");
  });

  it("refuses a date that does not exist", () => {
    assert.throws(() => nextVersion([], "2026-02-30"), RE_1);
  });
});

describe("summarize", () => {
  it("counts bullets per category", () => {
    const { body } = { body: UNRELEASED.split("## [Unreleased]")[1] };
    assert.deepEqual(summarize(body), [
      { category: "🔄 Changed", entries: 2 },
      { category: "🐛 Fixed", entries: 1 },
    ]);
  });
});

describe("cut", () => {
  it("moves Unreleased into the release page and resets it", () => {
    const { dir, root } = fixture();
    try {
      const result = run(root, ["cut", "1.11.5", "--description", DESCRIPTION]);
      assert.equal(result.code, 0, result.out);

      const release = readFileSync(join(dir, "1.11.5.mdx"), "utf8");
      assert.match(release, RE_2);
      assert.match(release, RE_3);
      assert.match(release, RE_4);

      assert.deepEqual(JSON.parse(readFileSync(join(dir, "meta.json"), "utf8")).pages, [
        "1.11.5",
        "1.11.4",
        "1.11.3",
        "1.10.2",
      ]);

      assert.equal(
        readFileSync(join(dir, "unreleased.mdx"), "utf8"),
        '---\ntitle: "Changelog Unreleased"\nhidden: true\nlast_updated: 2026-11-26\n---\n\n## [Unreleased]\n',
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("writes nothing on a dry run", () => {
    const { dir, root } = fixture();
    try {
      const result = run(root, ["cut", "1.11.5", "--description", DESCRIPTION, "--dry-run"]);
      assert.equal(result.code, 0, result.out);
      assert.equal(readFileSync(join(dir, "unreleased.mdx"), "utf8"), UNRELEASED);
      assert.equal(JSON.parse(readFileSync(join(dir, "meta.json"), "utf8")).pages[0], "1.11.4");
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("refuses to cut twice, an empty Unreleased, a release candidate, and a bad description", () => {
    const { root } = fixture();
    try {
      assert.equal(run(root, ["cut", "1.11.5", "--description", DESCRIPTION]).code, 0);
      assert.match(run(root, ["cut", "1.11.5", "--description", DESCRIPTION]).out, RE_5);
      assert.match(run(root, ["cut", "1.11.6", "--description", DESCRIPTION]).out, RE_6);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }

    const second = fixture();
    try {
      assert.match(
        run(second.root, ["cut", "1.11.5-rc.1", "--description", DESCRIPTION]).out,
        RE_7,
      );
      assert.match(
        run(second.root, ["cut", "1.11.5", "--description", "Bondery 1.11.5 is short."]).out,
        RE_8,
      );
      assert.match(
        run(second.root, [
          "cut",
          "1.11.5",
          "--description",
          DESCRIPTION.replace("1.11.5", "1.11.6"),
        ]).out,
        RE_9,
      );
      assert.equal(run(second.root, ["cut", "1.11.5"]).code, 2);
    } finally {
      rmSync(second.root, { force: true, recursive: true });
    }
  });

  it("quotes a description that plain YAML would misread", () => {
    const { dir, root } = fixture();
    try {
      const description = DESCRIPTION.replace("and removes", "and: removes");
      assert.equal(run(root, ["cut", "1.11.5", "--description", description]).code, 0);
      assert.match(readFileSync(join(dir, "1.11.5.mdx"), "utf8"), RE_10);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

describe("commands", () => {
  it("prints the next version and the unreleased summary", () => {
    const { root } = fixture();
    try {
      assert.equal(run(root, ["next-version"]).out, "1.11.5");
      assert.equal(run(root, ["next-version", "--date", "2026-12-01"]).out, "1.12.0");
      const status = run(root, ["status"]);
      assert.match(status.out, RE_11);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("prints usage for an unknown command", () => {
    const { root } = fixture();
    try {
      assert.equal(run(root, ["nope"]).code, 2);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
