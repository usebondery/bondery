#!/usr/bin/env node
/**
 * Free a local dev port. Linux/WSL uses fuser (reliable for next-server
 * listeners) plus process-name patterns for orphans whose parent
 * (turbo / npm) already exited. Windows uses netstat + taskkill.
 */
import { execSync } from "node:child_process";

const IS_WINDOWS = process.platform === "win32";

const DEFAULT_PATTERNS_BY_PORT = {
  26630: ["next dev --port 26630", "next-server \\(v"],
  26631: [
    "--import tsx src/index.ts",
    "node --require .*/tsx/dist/preflight.cjs.*src/index.ts",
  ],
  26632: ["next dev --port 26632", "next-server \\(v"],
};

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

function sleep300ms() {
  if (IS_WINDOWS) {
    run('powershell -NoProfile -Command "Start-Sleep -Milliseconds 300"', { ignoreError: true });
    return;
  }
  run("sleep 0.3", { ignoreError: true });
}

function portListeners(port) {
  if (IS_WINDOWS) {
    const out = run("netstat -ano", { ignoreError: true });
    const suffix = `:${port}`;
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => {
        if (!/LISTENING/i.test(line)) {
          return false;
        }
        const parts = line.split(/\s+/);
        const local = parts[1] ?? "";
        return local.endsWith(suffix);
      })
      .join("\n")
      .trim();
  }

  const out = run(`ss -tlnp 'sport = :${port}'`, { ignoreError: true });
  return out
    .split("\n")
    .filter((line) => line.includes("LISTEN") && line.includes(`:${port}`))
    .join("\n")
    .trim();
}

function windowsListeningPids(port) {
  const pids = new Set();
  for (const line of portListeners(port).split("\n")) {
    const match = line.trim().match(/LISTENING\s+(\d+)\s*$/i);
    if (match && match[1] !== "0") {
      pids.add(match[1]);
    }
  }
  return [...pids];
}

function killWindowsPort(port, log, quiet) {
  const pids = windowsListeningPids(port);
  if (pids.length === 0) {
    log(`Port ${port} is already free.`);
    return true;
  }

  log(`Port ${port} in use by PID(s) ${pids.join(", ")}`);
  log(`Killing listeners on port ${port}...`);
  for (const pid of pids) {
    run(`taskkill /PID ${pid} /T /F`, { ignoreError: true });
  }

  sleep300ms();

  const after = portListeners(port);
  if (after) {
    if (!quiet) {
      console.error(`\nPort ${port} is still in use:\n${after}`);
    }
    return false;
  }

  log(`Port ${port} is free.`);
  return true;
}

/**
 * @param {number} port
 * @param {{ patterns?: string[], quiet?: boolean }} [options]
 * @returns {boolean} true when the port is free afterward
 */
export function killDevPort(port, { patterns = [], quiet = false } = {}) {
  const log = quiet ? () => {} : console.log.bind(console);

  if (IS_WINDOWS) {
    return killWindowsPort(port, log, quiet);
  }

  const mergedPatterns = [...patterns, ...(DEFAULT_PATTERNS_BY_PORT[port] ?? [])];

  const before = portListeners(port);
  if (!before) {
    log(`Port ${port} is already free.`);
    return true;
  }

  log(`Port ${port} in use:\n${before}`);
  log(`Killing listeners on port ${port}...`);
  run(`fuser -k ${port}/tcp`, { ignoreError: true });

  for (const pattern of mergedPatterns) {
    log(`Killing processes matching: ${pattern}`);
    run(`pkill -9 -f '${pattern}'`, { ignoreError: true });
  }

  sleep300ms();

  const after = portListeners(port);
  if (after) {
    if (!quiet) {
      console.error(`\nPort ${port} is still in use:\n${after}`);
    }
    return false;
  }

  log(`Port ${port} is free.`);
  return true;
}

function parsePortArg(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function main() {
  const ports = process.argv.slice(2).map(parsePortArg);
  if (ports.length === 0) {
    console.error("Usage: node scripts/dev/kill-dev-port.mjs <port> [port...]");
    process.exit(1);
  }

  let ok = true;
  for (const port of ports) {
    if (!killDevPort(port)) {
      ok = false;
    }
  }

  process.exit(ok ? 0 : 1);
}

if (process.argv[1]?.endsWith("kill-dev-port.mjs")) {
  main();
}
