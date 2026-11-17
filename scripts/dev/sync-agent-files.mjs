/**
 * Mirror agent definitions and skills from `.agents/` into every coding tool's folder.
 *
 * `.agents/` is the one place to edit. Each tool only reads its own folder:
 *
 *   .agents/agents/*.md   -> .claude/agents/  (Claude Code, also inside Orca)
 *                         -> .cursor/agents/  (Cursor)
 *   .agents/skills/<name> -> .claude/skills/  (Claude Code; Codex and Cursor read .agents/skills)
 *
 * Mirrors are committed so a fresh clone works in every tool without a setup step. Git stores
 * identical files once, so the copies cost almost nothing.
 *
 * Usage:
 *   node scripts/dev/sync-agent-files.mjs           # write the mirrors
 *   node scripts/dev/sync-agent-files.mjs --check   # fail when a mirror drifted (CI, check:changed)
 *   node scripts/dev/sync-agent-files.mjs --stage   # write, then `git add` the mirrors (pre-commit)
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

/** Each source folder and the folders that must mirror it exactly. */
export const MIRRORS = [
  { source: ".agents/agents", targets: [".claude/agents", ".cursor/agents"] },
  { source: ".agents/skills", targets: [".claude/skills"] },
];

function listFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function relativeFiles(dir) {
  return listFiles(dir)
    .map((file) => relative(dir, file).split(sep).join("/"))
    .sort();
}

/** Paths that differ between a source folder and one mirror, relative to the repo root. */
export function findDrift(sourceDir, targetDir) {
  const source = relativeFiles(sourceDir);
  const target = relativeFiles(targetDir);
  const drift = [];
  for (const file of source) {
    const mirrored = join(targetDir, file);
    if (!existsSync(mirrored)) {
      drift.push(`missing ${relative(ROOT, mirrored)}`);
    } else if (!readFileSync(join(sourceDir, file)).equals(readFileSync(mirrored))) {
      drift.push(`changed ${relative(ROOT, mirrored)}`);
    }
  }
  const sourceSet = new Set(source);
  for (const file of target) {
    if (!sourceSet.has(file)) {
      drift.push(
        `extra ${relative(ROOT, join(targetDir, file))} (delete it or add it to ${relative(ROOT, sourceDir)})`,
      );
    }
  }
  return drift.map((line) => line.split(sep).join("/"));
}

function writeMirror(sourceDir, targetDir) {
  rmSync(targetDir, { force: true, recursive: true });
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

function main() {
  const check = process.argv.includes("--check");
  const stage = process.argv.includes("--stage");

  if (check) {
    const drift = MIRRORS.flatMap(({ source, targets }) =>
      targets.flatMap((target) => findDrift(join(ROOT, source), join(ROOT, target))),
    );
    if (drift.length > 0) {
      console.error("check-agent-files: failed\n");
      for (const line of drift) {
        console.error(`  - ${line}`);
      }
      console.error("\nEdit files under .agents/, then run `pnpm run agents:sync`.");
      process.exit(1);
    }
    console.log("check-agent-files: ok");
    return;
  }

  for (const { source, targets } of MIRRORS) {
    for (const target of targets) {
      writeMirror(join(ROOT, source), join(ROOT, target));
    }
  }
  if (stage) {
    const paths = MIRRORS.flatMap(({ targets }) => targets);
    execFileSync("git", ["add", "--all", "--", ...paths], { cwd: ROOT, stdio: "inherit" });
  }
  console.log("agents:sync: mirrors written");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
