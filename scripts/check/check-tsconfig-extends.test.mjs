import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";

import { findViolations } from "./check-tsconfig-extends.mjs";

/**
 * @param {string} root
 * @param {string} rel
 * @param {unknown} value
 */
const BONDERY_TYPESCRIPT_CONFIG_BASE_JSON_RE = /@bondery\/typescript-config\/base\.json/;
const ALLOWJS_RE = /allowJs/;
const BASE_JSON_RE = /base\.json/;

function writeJson(root, rel, value) {
  const filePath = join(root, rel);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * @param {string} root
 */
function writePresets(root) {
  writeJson(root, "packages/typescript-config/base.json", {
    compilerOptions: { strict: true },
  });
  writeJson(root, "packages/typescript-config/nextjs.json", {
    compilerOptions: { jsx: "preserve" },
    extends: "./base.json",
  });
  writeJson(root, "packages/typescript-config/react-library.json", {
    compilerOptions: { jsx: "react-jsx" },
    extends: "./base.json",
  });
}

let projectDir = "";

before(() => {
  projectDir = mkdtempSync(join(tmpdir(), "bondery-tsconfig-extends-"));
  writePresets(projectDir);

  writeJson(projectDir, "packages/orphan/tsconfig.json", {
    compilerOptions: { strict: true },
  });
  writeJson(projectDir, "packages/ok-base/tsconfig.json", {
    compilerOptions: { outDir: "./dist" },
    extends: "@bondery/typescript-config/base.json",
  });
  writeJson(projectDir, "apps/webapp-like/tsconfig.json", {
    compilerOptions: { paths: { "@/*": ["./src/*"] } },
    extends: "@bondery/typescript-config/nextjs.json",
  });
  writeJson(projectDir, "apps/webapp-like/typecheck-experiments/tsconfig.shared.json", {
    compilerOptions: { jsx: "react-jsx" },
    extends: "../tsconfig.json",
  });
  writeJson(projectDir, "apps/mobile-like/tsconfig.json", {
    compilerOptions: { jsx: "react-jsx" },
    extends: ["expo/tsconfig.base", "@bondery/typescript-config/base.json"],
  });
  writeJson(projectDir, "packages/orphan/generated/tsconfig.json", {
    compilerOptions: { strict: true },
  });
  mkdirSync(join(projectDir, "packages/excepted"), { recursive: true });
  writeFileSync(
    join(projectDir, "packages/excepted/tsconfig.json"),
    `// allow-workaround(#1)\n${JSON.stringify({ compilerOptions: { strict: true } }, null, 2)}\n`,
  );
});

after(() => {
  rmSync(projectDir, { force: true, recursive: true });
});

describe("findViolations", () => {
  it("fails a tsconfig with no extends", () => {
    const messages = findViolations(projectDir);
    const hit = messages.find((message) => message.includes("packages/orphan/tsconfig.json"));
    assert.ok(hit);
    assert.match(hit ?? "", BONDERY_TYPESCRIPT_CONFIG_BASE_JSON_RE);
  });

  it("passes a tsconfig that extends base", () => {
    const messages = findViolations(projectDir);
    assert.equal(
      messages.filter((message) => message.includes("packages/ok-base/tsconfig.json")).length,
      0,
    );
  });

  it("passes a tsconfig that extends a local file that extends nextjs", () => {
    const messages = findViolations(projectDir);
    assert.equal(
      messages.filter((message) =>
        message.includes("apps/webapp-like/typecheck-experiments/tsconfig.shared.json"),
      ).length,
      0,
    );
  });

  it("passes base.json as the exempt root preset", () => {
    const messages = findViolations(projectDir);
    assert.equal(
      messages.filter((message) => message.includes("packages/typescript-config/base.json")).length,
      0,
    );
  });

  it("passes an extends array that names a preset even when the vendor file is missing", () => {
    const messages = findViolations(projectDir);
    assert.equal(
      messages.filter((message) => message.includes("apps/mobile-like/tsconfig.json")).length,
      0,
    );
  });

  it("does not scan tsconfig files under skipped directories", () => {
    const messages = findViolations(projectDir);
    assert.equal(messages.filter((message) => message.includes("/generated/")).length, 0);
  });

  it("skips a tsconfig that carries a tracked exception", () => {
    const messages = findViolations(projectDir);
    assert.equal(
      messages.filter((message) => message.includes("packages/excepted/tsconfig.json")).length,
      0,
    );
  });
});

describe("allowJs stays false outside base.json", () => {
  it("fails a preset or app tsconfig that sets allowJs true", () => {
    const root = mkdtempSync(join(tmpdir(), "bondery-tsconfig-allowjs-"));
    try {
      writeJson(root, "packages/typescript-config/base.json", {
        compilerOptions: { allowJs: false, strict: true },
      });
      writeJson(root, "packages/typescript-config/nextjs.json", {
        compilerOptions: { allowJs: true, jsx: "preserve" },
        extends: "./base.json",
      });
      writeJson(root, "packages/typescript-config/react-library.json", {
        compilerOptions: { jsx: "react-jsx" },
        extends: "./base.json",
      });
      writeJson(root, "packages/ok-base/tsconfig.json", {
        compilerOptions: { outDir: "./dist" },
        extends: "@bondery/typescript-config/base.json",
      });
      const messages = findViolations(root);
      const hit = messages.find((message) =>
        message.includes("packages/typescript-config/nextjs.json"),
      );
      assert.ok(hit);
      assert.match(hit ?? "", ALLOWJS_RE);
      assert.equal(
        messages.filter((message) => message.includes("packages/ok-base/tsconfig.json")).length,
        0,
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

describe("nextjs.json and react-library.json must extend ./base.json", () => {
  it("fails nextjs.json when it does not extend the root preset", () => {
    const root = mkdtempSync(join(tmpdir(), "bondery-tsconfig-nextjs-"));
    try {
      writeJson(root, "packages/typescript-config/base.json", {
        compilerOptions: { strict: true },
      });
      writeJson(root, "packages/typescript-config/nextjs.json", {
        compilerOptions: { jsx: "preserve" },
      });
      writeJson(root, "packages/typescript-config/react-library.json", {
        compilerOptions: { jsx: "react-jsx" },
        extends: "./base.json",
      });
      const messages = findViolations(root);
      const hit = messages.find((message) =>
        message.includes("packages/typescript-config/nextjs.json"),
      );
      assert.ok(hit);
      assert.match(hit ?? "", BASE_JSON_RE);
      assert.equal(
        messages.filter((message) =>
          message.includes("packages/typescript-config/react-library.json"),
        ).length,
        0,
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
