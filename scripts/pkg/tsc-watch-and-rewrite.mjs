#!/usr/bin/env node
/**
 * Runs `tsc --watch` and rewrites `#` imports in dist after each emit.
 * Next.js webpack cannot resolve package.json "imports" specifiers in compiled files.
 *
 * Usage: node scripts/pkg/tsc-watch-and-rewrite.mjs <package-dir>
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const pkg = process.argv[2];

if (!pkg) {
  console.error("usage: tsc-watch-and-rewrite.mjs <package-dir>");
  process.exit(1);
}

const tsc = join(root, "node_modules/typescript/bin/tsc");
if (!existsSync(tsc)) {
  console.error("tsc-watch-and-rewrite: could not find node_modules/typescript/bin/tsc");
  process.exit(1);
}

const pkgDir = join(root, "packages", pkg);
const rewriteScript = join(root, "scripts/pkg/rewrite-package-hash-imports-in-dist.mjs");

let rewriteTimer;
let rewriteInFlight = false;
let rewriteQueued = false;

function scheduleRewrite() {
  clearTimeout(rewriteTimer);
  rewriteTimer = setTimeout(() => {
    void runRewrite();
  }, 250);
}

function runRewrite() {
  if (rewriteInFlight) {
    rewriteQueued = true;
    return;
  }
  rewriteInFlight = true;
  const child = spawn(process.execPath, [rewriteScript, pkg], {
    cwd: root,
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    rewriteInFlight = false;
    if (code !== 0) {
      console.error(`tsc-watch-and-rewrite: rewrite exited ${code}`);
    }
    if (rewriteQueued) {
      rewriteQueued = false;
      scheduleRewrite();
    }
  });
  child.on("error", (error) => {
    rewriteInFlight = false;
    console.error(error);
  });
}

const compiler = spawn(process.execPath, [tsc, "--watch", "--preserveWatchOutput"], {
  cwd: pkgDir,
  stdio: ["inherit", "pipe", "pipe"],
});

function onChunk(chunk, stream) {
  stream.write(chunk);
  if (chunk.toString().includes("Watching for file changes")) {
    scheduleRewrite();
  }
}

compiler.stdout.on("data", (chunk) => onChunk(chunk, process.stdout));
compiler.stderr.on("data", (chunk) => onChunk(chunk, process.stderr));

compiler.on("exit", (code) => {
  process.exit(code ?? 1);
});

process.on("SIGINT", () => {
  compiler.kill("SIGINT");
});
process.on("SIGTERM", () => {
  compiler.kill("SIGTERM");
});
