import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  extractArguments,
  findMessages,
  hasRemedy,
  isRemedyInValue,
  literalText,
} from "./check-diagnostic-messages.mjs";

const MJS_GRIT_RE = /\.(?:mjs|grit)$/u;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("literalText", () => {
  it("drops the delimiters of a template literal so they are not read as inline code", () => {
    assert.equal(literalText("`missing frontmatter`"), "missing frontmatter");
  });

  it("replaces each interpolation with one placeholder", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the text is a fixture that must contain a literal ${...}.
    assert.equal(literalText("`${path}: missing description`"), "\u0000: missing description");
  });

  it("keeps nested braces and objects inside an interpolation out of the text", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the text is a fixture that must contain a literal ${...}.
    assert.equal(literalText("`a ${JSON.stringify({ b: 1 })} c`"), "a \u0000 c");
  });
  it("joins a concatenated literal into one sentence", () => {
    assert.equal(
      literalText('`is not in the spec` + ". Fix the path."'),
      "is not in the spec. Fix the path.",
    );
  });
});

describe("hasRemedy", () => {
  const good = [
    "Use constantTimeEqual() so the compare time does not leak the value.",
    "Join className parts with cn() from the cn package.",
    "Missing docs page at docs/api/errors/validation_error.mdx",
    "Add allowedDevOrigins to apps/website/next.config.ts.",
    "Update EXPECTED_HOSTS in check-dev-hostnames.mjs.",
    "Regenerate the spec with `pnpm run generate:openapi`.",
    'auth must be oauth with client mode "cimd".',
    "UPLOAD_LIMITS.default must stay at or below 10 MB.",
    "Run `pnpm run build:llm-plugins` to regenerate the bundle.",
  ];

  /** Messages taken from this repo before the check existed. */
  const bad = [
    "missing frontmatter",
    "is not a regular file.",
    "The plugin bundle content is wrong.",
    "Parsed no routes. Is the spec valid?",
  ];

  for (const message of good) {
    it(`accepts: ${message}`, () => {
      assert.equal(hasRemedy(message), true, message);
    });
  }

  for (const message of bad) {
    it(`rejects: ${message}`, () => {
      assert.equal(hasRemedy(message), false, message);
    });
  }
});

describe("extractArguments", () => {
  it("reads a template literal containing parentheses and braces", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the text is a fixture that must contain a literal ${...}.
    const source = "check.add(`a (b) {c} ${fn({ d: 1 })}`);";
    assert.deepEqual(
      extractArguments(source, "check.add(").map((entry) => entry.argument),
      // biome-ignore lint/suspicious/noTemplateCurlyInString: the text is a fixture that must contain a literal ${...}.
      ["`a (b) {c} ${fn({ d: 1 })}`"],
    );
  });

  it("stops at a top-level comma so a second argument is not swallowed", () => {
    const source = "check.add(`first`, { extra: true });";
    assert.deepEqual(
      extractArguments(source, "check.add(").map((entry) => entry.argument),
      ["`first`"],
    );
  });

  it("does not treat a parenthesis inside a string as a closing bracket", () => {
    const source = `check.add("a ) b");`;
    assert.deepEqual(
      extractArguments(source, "check.add(").map((entry) => entry.argument),
      ['"a ) b"'],
    );
  });
});

describe("findMessages", () => {
  it("reports the line of the call, not of the file start", () => {
    const source = ["const a = 1;", "check.add(`Use cn() here.`);"].join("\n");
    assert.deepEqual(
      findMessages(source, "x.mjs").map((entry) => entry.line),
      [2],
    );
  });

  it("reads plugin messages from the grit attribute", () => {
    const source = `register_diagnostic(message="Use cn().", severity="error")`;
    assert.equal(findMessages(source, "x.grit").length, 1);
  });

  it("skips a message passed as an identifier, which this check cannot read", () => {
    assert.deepEqual(findMessages("check.add(message);", "x.mjs"), []);
  });
});

describe("isRemedyInValue", () => {
  const lines = [
    "check.add(",
    "  `a` +",
    "    suffix(), // diagnostic-message: remedy-in-value suffix()",
    ");",
  ];

  it("finds the marker on the closing line of a multi-line call", () => {
    assert.equal(isRemedyInValue(lines, 2), true);
  });

  it("finds no marker when the window holds none", () => {
    assert.equal(isRemedyInValue(["check.add(`a`)", "", "", "", ""], 1), false);
  });
});

describe("every diagnostic in the repo", () => {
  const dirs = ["scripts/check", "biome/plugins"];
  const files = dirs.flatMap((dir) =>
    readdirSync(join(repoRoot, dir))
      .filter((entry) => MJS_GRIT_RE.test(entry))
      .filter((entry) => !entry.includes("check-diagnostic-messages"))
      .map((entry) => join(dir, entry)),
  );

  for (const rel of files) {
    it(`${rel} messages each say how to fix the problem`, () => {
      const source = readFileSync(join(repoRoot, rel), "utf8");
      const lines = source.split("\n");
      const missing = findMessages(source, rel)
        .filter(({ line }) => !isRemedyInValue(lines, line))
        .filter(({ text }) => !hasRemedy(text))
        .map(({ line, text }) => `${line}: ${text}`);
      assert.deepEqual(missing, []);
    });
  }
});
