#!/usr/bin/env node
/**
 * Free the webapp dev port (26632). Uses fuser because lsof often misses
 * next-server listeners in WSL.
 */
import { execSync } from "node:child_process";

const PORT = 26632;

function run(command, { ignoreError = false } = {}) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    if (ignoreError) {
      return [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    }
    throw error;
  }
}

function portListeners() {
  try {
    const out = run(`ss -tlnp 'sport = :${PORT}'`, { ignoreError: true });
    return out
      .split("\n")
      .filter((line) => line.includes("LISTEN") && line.includes(`:${PORT}`))
      .join("\n")
      .trim();
  } catch {
    return "";
  }
}

console.log(`Checking port ${PORT}...`);
const before = portListeners();
if (before) {
  console.log(before);
} else {
  console.log("No listener found via ss.");
}

console.log(`Killing processes on port ${PORT}...`);
run(`fuser -k ${PORT}/tcp`, { ignoreError: true });

console.log("Killing next dev launcher processes...");
run(`pkill -9 -f 'next dev --port ${PORT}'`, { ignoreError: true });

// Allow the kernel to release the socket before we verify.
run("sleep 0.3", { ignoreError: true });

const after = portListeners();
if (after) {
  console.error(`\nPort ${PORT} is still in use:\n${after}`);
  process.exit(1);
}

console.log(`\nPort ${PORT} is free.`);
