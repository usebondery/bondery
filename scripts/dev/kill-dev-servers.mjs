#!/usr/bin/env node
/**
 * Stop every local dev process for this repo.
 *
 * Freeing the three listening ports is not enough. Several dev processes hold no
 * port but keep working: the tsc watch compilers behind the compiled packages,
 * and the translations locale watcher. They lock each package dist folder, so a
 * later build fails in the clean-dist helper with ENOTEMPTY on Windows, and a
 * retry then succeeds only because the stale watcher happened to exit.
 *
 * Kill by command line as well as by port, so this command means what it says.
 */
import { execSync } from "node:child_process";
import { killDevPort } from "./kill-dev-port.mjs";

const IS_WINDOWS = process.platform === "win32";

const ports = [26630, 26631, 26632];

/**
 * Command-line fragments for dev processes that hold no port.
 * Each must be specific enough not to match a one-shot build, test, or editor.
 */
const WATCHER_PATTERNS = [
  "tsc-watch-and-rewrite",
  "packages/translations/scripts/dev.mjs",
  "tsx watch --env-file=.env.development.local",
];

function run(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

/**
 * PIDs whose command line matches a fragment.
 *
 * Windows reads the process list through PowerShell with no shell quoting games.
 * The script arrives on stdin and the fragment travels in an environment variable,
 * so a fragment that contains quotes cannot break the command.
 */
function findPids(fragment) {
  if (IS_WINDOWS) {
    const script = [
      "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\"",
      "| Where-Object { $_.CommandLine -and $_.CommandLine.Contains($env:BONDERY_KILL_FRAGMENT) }",
      "| Select-Object -ExpandProperty ProcessId",
    ].join(" ");

    let out;
    try {
      out = execSync("powershell -NoProfile -Command -", {
        encoding: "utf8",
        env: { ...process.env, BONDERY_KILL_FRAGMENT: fragment },
        input: script,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch {
      return [];
    }

    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line));
  }

  const out = run(`pgrep -f '${fragment.replace(/'/g, "'\\''")}'`);
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line));
}

function killPid(pid) {
  if (IS_WINDOWS) {
    run(`taskkill /PID ${pid} /T /F`);
    return;
  }
  run(`kill -9 ${pid}`);
}

function killWatchers() {
  let ok = true;

  for (const fragment of WATCHER_PATTERNS) {
    const pids = findPids(fragment);
    if (pids.length === 0) {
      console.log(`No watcher running for: ${fragment}`);
      continue;
    }

    console.log(`Killing watcher(s) ${pids.join(", ")} matching: ${fragment}`);
    for (const pid of pids) {
      killPid(pid);
    }
  }

  // Re-check so a pattern that silently failed to die is reported, not ignored.
  for (const fragment of WATCHER_PATTERNS) {
    if (findPids(fragment).length > 0) {
      console.error(`Watcher survived the kill: ${fragment}`);
      ok = false;
    }
  }

  return ok;
}

let ok = true;

for (const port of ports) {
  if (!killDevPort(port)) {
    ok = false;
  }
}

if (!killWatchers()) {
  ok = false;
}

process.exit(ok ? 0 : 1);
