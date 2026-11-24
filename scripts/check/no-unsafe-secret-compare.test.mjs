/**
 * Regression tests for biome/plugins/no-unsafe-secret-compare.grit.
 *
 * Biome runs plugins only on files on disk (not on stdin), so each case is
 * written into a throwaway project in the OS temp directory with its own
 * biome.json that loads the plugin and nothing else.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const CONSTANTTIMEEQUAL_RE = /constantTimeEqual/;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pluginPath = join(repoRoot, "biome", "plugins", "no-unsafe-secret-compare.grit");
const biomeBin = createRequire(join(repoRoot, "package.json")).resolve("@biomejs/biome/bin/biome");

/** Each case: [relative path, source, expected diagnostic count]. */
const CASES = [
  [
    "apps/api/src/alias.ts",
    `export function f(token: string, cfg: { BONDERY_PRIVATE_SERVICE_SECRET: string }) {
  const expected = cfg.BONDERY_PRIVATE_SERVICE_SECRET;
  return !expected || token !== expected;
}`,
    1,
  ],
  [
    "apps/api/src/inner-closure.ts",
    `export const f = (token: string, cfg: { WEBHOOK_SECRET: string }) => {
  const expected = cfg.WEBHOOK_SECRET;
  return () => token === expected;
};`,
    1,
  ],
  [
    "apps/api/src/member.ts",
    `export const f = (t: string, env: Record<string, string>) => t == env.STRIPE_WEBHOOK_SECRET;`,
    1,
  ],
  [
    "apps/api/src/names.ts",
    `export function f(a: string, signature: string, csrfToken: string, apiKey: string, b: string) {
  return a === signature || csrfToken !== b || apiKey === b;
}`,
    3,
  ],
  [
    "apps/webapp/src/server.ts",
    `export const f = (a: string, password: string) => a === password;`,
    1,
  ],
  [
    "apps/api/src/transcripts/x.ts",
    `export const f = (a: string, secret: string) => a === secret;`,
    1,
  ],
  [
    "apps/api/src/presence.ts",
    `export function f(secret: string | undefined, apiKey: unknown) {
  return secret === undefined || secret === null || secret !== "" || typeof apiKey === "string" || secret.length === 32;
}`,
    0,
  ],
  [
    "apps/api/src/not-secret.ts",
    `const LINKEDIN_HEADER_SIGNATURE = "First Name,Last Name";
export function f(line: string, hasId: boolean, hasSecret: boolean, part: string, brandToken: string) {
  return line === LINKEDIN_HEADER_SIGNATURE || hasId !== hasSecret || part === brandToken || line.split(".").length === 3;
}`,
    0,
  ],
  [
    "apps/api/src/helper.ts",
    `declare function constantTimeEqual(a: string, b: string): boolean;
export const f = (token: string, secret: string) => constantTimeEqual(token, secret);`,
    0,
  ],
  [
    "apps/mobile/src/client.ts",
    `export const f = (currentAccessToken: string, expectedAccessToken: string) => currentAccessToken === expectedAccessToken;`,
    0,
  ],
  [
    "scripts/dev/setup.ts",
    `export const f = (value: string, password: string) => value === password;`,
    0,
  ],
];

let projectDir;
const counts = new Map();

before(() => {
  projectDir = mkdtempSync(join(tmpdir(), "biome-secret-compare-"));
  copyFileSync(pluginPath, join(projectDir, "rule.grit"));
  writeFileSync(
    join(projectDir, "biome.json"),
    JSON.stringify({
      formatter: { enabled: false },
      linter: { enabled: true },
      plugins: ["./rule.grit"],
      root: true,
    }),
  );
  for (const [path, source] of CASES) {
    mkdirSync(dirname(join(projectDir, path)), { recursive: true });
    writeFileSync(join(projectDir, path), `${source}\n`);
  }

  const result = spawnSync(
    process.execPath,
    [biomeBin, "lint", "--reporter=json", "--max-diagnostics=none", "."],
    { cwd: projectDir, encoding: "utf8" },
  );
  const report = JSON.parse(result.stdout);
  for (const diagnostic of report.diagnostics) {
    if (diagnostic.category !== "plugin") {
      continue;
    }
    assert.match(diagnostic.message, CONSTANTTIMEEQUAL_RE, "plugin failed to run");
    const file = diagnostic.location.path.replaceAll("\\", "/");
    counts.set(file, (counts.get(file) ?? 0) + 1);
  }
});

after(() => {
  if (projectDir) {
    rmSync(projectDir, { force: true, recursive: true });
  }
});

describe("no-unsafe-secret-compare Biome plugin", () => {
  for (const [path, , expected] of CASES) {
    it(`reports ${expected} in ${path}`, () => {
      assert.equal(counts.get(path) ?? 0, expected);
    });
  }
});
