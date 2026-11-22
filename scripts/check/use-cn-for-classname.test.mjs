/**
 * Regression tests for biome/plugins/use-cn-for-classname.grit.
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

const CN_RE = /cn\(\)/;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pluginPath = join(repoRoot, "biome", "plugins", "use-cn-for-classname.grit");
const biomeBin = createRequire(join(repoRoot, "package.json")).resolve("@biomejs/biome/bin/biome");

const PRELUDE = `import { cn } from "cn";
declare function clsx(...parts: unknown[]): string;
declare function cx(...parts: unknown[]): string;
declare function joinClassNames(...parts: Array<string | undefined>): string;
declare const classes: { card: string };
declare const isActive: boolean;
declare const country: string;
declare const className: string | undefined;
`;

/** Each case: [name, jsx expression for className, expected diagnostic count]. */
const CASES = [
  ["static string", `"p-2"`, 0],
  ["identifier", `{className}`, 0],
  ["member access", `{classes.card}`, 0],
  ["cn call", `{cn("p-2", className)}`, 0],
  ["cn with conditional", `{cn("p-2", isActive && "p-4")}`, 0],
  ["cn with ternary", `{cn(isActive ? "p-2" : "p-4")}`, 0],
  ["cn with dynamic class", `{cn(\`fi fi-\${country}\`)}`, 0],
  ["cn with nested call", `{cn(country.toUpperCase())}`, 0],
  ["ternary selecting one class", `{isActive ? "p-2" : "p-4"}`, 0],
  ["template literal", `{\`p-2 \${className}\`}`, 1],
  ["concatenation", `{"p-2 " + className}`, 1],
  ["array join", `{["p-2", className].join(" ")}`, 1],
  ["clsx helper", `{clsx("p-2", className)}`, 1],
  ["cx helper", `{cx("p-2", className)}`, 1],
  ["joinClassNames helper", `{joinClassNames("p-2", className)}`, 1],
  ["concatenation around cn", `{cn("p-2") + " extra"}`, 1],
  ["template inside ternary", `{isActive ? \`p-2 \${country}\` : "p-4"}`, 1],
];

/** One file with every case, one element per case line. */
function fixtureSource() {
  const lines = CASES.map(([, expression]) => `      <div className=${expression} />`);
  return `${PRELUDE}
export function Fixture() {
  return (
    <div>
${lines.join("\n")}
    </div>
  );
}
`;
}

let projectDir;
const counts = new Map();

before(() => {
  projectDir = mkdtempSync(join(tmpdir(), "biome-cn-classname-"));
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
  mkdirSync(join(projectDir, "src"), { recursive: true });
  writeFileSync(join(projectDir, "src", "fixture.tsx"), fixtureSource());

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
    assert.match(diagnostic.message, CN_RE, "plugin failed to run");
    const line = diagnostic.location.start.line;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
});

after(() => {
  if (projectDir) {
    rmSync(projectDir, { force: true, recursive: true });
  }
});

describe("use-cn-for-classname Biome plugin", () => {
  // The prelude and the two wrapper lines precede the cases.
  const firstCaseLine = PRELUDE.split("\n").length + 4;
  for (const [index, [name, , expected]] of CASES.entries()) {
    it(`reports ${expected} for ${name}`, () => {
      assert.equal(counts.get(firstCaseLine + index) ?? 0, expected);
    });
  }
});
