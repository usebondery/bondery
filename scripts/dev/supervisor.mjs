/**
 * Single-owner dev supervisor.
 *
 * One dev session runs per checkout. The supervisor takes a lock, frees the
 * ports of the selected target, and starts one `turbo run` child process. A
 * second invocation stops before it starts any server.
 *
 * Lock file: `.temp/dev.lock` (`/.temp/` is gitignored). The file holds JSON
 * `{ pid, target, startedAt, cwd }`. The probe uses `process.kill(pid, 0)`.
 * A stale lock (no live pid) is replaced. A live lock is never killed.
 *
 * Targets: `all`, `webapp`, `website`, `api`, `mobile`, `extension`,
 * `chrome-extension`, `webapp-api`, `webapp-api-emails`, `emails`. Pass turbo
 * task names (`webapp#dev api#dev`) for an explicit list.
 *
 * Usage:
 *   node scripts/dev/supervisor.mjs webapp
 *   node scripts/dev/supervisor.mjs "webapp#dev,api#dev"
 */
import { spawn, spawnSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEV_PORTS, DEV_URLS } from "@bondery/schemas/constants/dev-ports";

import { killDevPort } from "./kill-dev-port.mjs";

/**
 * @param {unknown} value
 * @returns {unknown}
 */
const PATTERN_5E5B5C774023_RE = /^[\w@#./:=+-]+$/u;

function asUnknown(value) {
  return value;
}

const IS_WINDOWS = process.platform === "win32";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const tempDir = resolve(repoRoot, ".temp");
const lockPath = resolve(tempDir, "dev.lock");

/** Port and display URL for each turbo dev task. */
const TASK_INFO = {
  "@bondery/emails#preview": { port: DEV_PORTS.EMAIL_PREVIEW, url: DEV_URLS.emailPreview },
  "api#dev": { port: DEV_PORTS.API, url: DEV_URLS.api },
  "chrome-extension#dev": { port: DEV_PORTS.EXTENSION, url: DEV_URLS.extension },
  "mobile#dev": { port: DEV_PORTS.MOBILE, url: DEV_URLS.mobile },
  "webapp#dev": { port: DEV_PORTS.WEBAPP, url: DEV_URLS.webapp },
  "website#dev": { port: DEV_PORTS.WEBSITE, url: DEV_URLS.website },
};

/** Target name to turbo task list. Mirrors the task sets of the old scripts. */
const TARGETS = {
  all: ["dev"],
  api: ["api#dev"],
  "chrome-extension": ["chrome-extension#dev"],
  emails: ["@bondery/emails#preview"],
  extension: ["webapp#dev", "api#dev", "chrome-extension#dev", "website#dev"],
  mobile: ["api#dev", "mobile#dev"],
  webapp: ["webapp#dev"],
  "webapp-api": ["webapp#dev", "api#dev"],
  "webapp-api-emails": ["webapp#dev", "api#dev", "@bondery/emails#preview"],
  website: ["website#dev"],
};

/** Ports that `turbo run dev` can bind. */
const ALL_DEV_PORTS = Object.values(TASK_INFO).map((entry) => entry.port);

/**
 * @param {string} value
 * @returns {string}
 */
function shellQuote(value) {
  return PATTERN_5E5B5C774023_RE.test(value) ? value : `"${value.replaceAll('"', '""')}"`;
}

/**
 * @param {number} pid
 * @returns {boolean} true when the process exists
 */
function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function readLock() {
  try {
    const parsed = asUnknown(JSON.parse(readFileSync(lockPath, "utf8")));
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Take the dev lock, or report the owner and stop.
 *
 * @param {string} target
 * @returns {void}
 */
function acquireLock(target) {
  mkdirSync(tempDir, { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = openSync(lockPath, "wx");
      const body = JSON.stringify(
        { cwd: repoRoot, pid: process.pid, startedAt: new Date().toISOString(), target },
        null,
        2,
      );
      writeSync(fd, `${body}\n`);
      closeSync(fd);
      return;
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
      const holder = readLock();
      if (holder && isProcessAlive(holder.pid)) {
        reportRunningSession(holder);
        process.exitCode = 1;
        return;
      }
      console.warn(`[dev] removing stale lock from pid ${holder?.pid ?? "unknown"}`);
      try {
        unlinkSync(lockPath);
      } catch {
        // Another process removed it first.
      }
    }
  }

  console.error("[dev] could not take .temp/dev.lock");
  process.exitCode = 1;
}

/**
 * @param {{ pid?: number, startedAt?: string, target?: string }} holder
 */
function reportRunningSession(holder) {
  const urls = urlsForTarget(holder.target);
  console.error("");
  console.error("A dev session is already running. Refusing to start a second one.");
  console.error(`  target:  ${holder.target ?? "unknown"}`);
  console.error(`  started: ${holder.startedAt ?? "unknown"}`);
  console.error(`  pid:     ${holder.pid}`);
  for (const url of urls) {
    console.error(`  url:     ${url}`);
  }
  console.error("");
  console.error("Stop it with Ctrl+C in that terminal, or run `pnpm run kill:dev`.");
  console.error("");
}

function releaseLock() {
  const holder = readLock();
  if (holder && holder.pid !== process.pid) {
    return;
  }
  try {
    unlinkSync(lockPath);
  } catch {
    // Already gone.
  }
}

/**
 * @param {string | undefined} target
 * @returns {string[]}
 */
function urlsForTarget(target) {
  const tasks = TARGETS[target ?? ""] ?? [];
  if (tasks.includes("dev")) {
    return Object.values(DEV_URLS).filter((url) => url.startsWith("http"));
  }
  const urls = [];
  for (const task of tasks) {
    const info = TASK_INFO[task];
    if (info && !urls.includes(info.url)) {
      urls.push(info.url);
    }
  }
  return urls;
}

/**
 * Resolve the ports of a task list. `turbo run dev` can start every app task,
 * so an explicit task list still frees the ports of its own tasks only.
 *
 * @param {string[]} tasks
 * @returns {number[]}
 */
function portsForTasks(tasks) {
  if (tasks.includes("dev")) {
    return ALL_DEV_PORTS;
  }
  const ports = new Set();
  for (const task of tasks) {
    const info = TASK_INFO[task];
    if (info) {
      ports.add(info.port);
    }
  }
  return [...ports];
}

/**
 * @param {string[]} argv
 * @returns {{ label: string, tasks: string[] }}
 */
function parseTarget(argv) {
  const [first] = argv;
  if (!first) {
    console.error(
      `Usage: node scripts/dev/supervisor.mjs <${Object.keys(TARGETS).join("|")}|task,task...>`,
    );
    process.exitCode = 1;
    return;
  }
  if (TARGETS[first]) {
    return { label: first, tasks: TARGETS[first] };
  }
  const tasks = argv
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  if (tasks.length === 0) {
    console.error("[dev] no turbo task given");
    process.exitCode = 1;
    return;
  }
  return { label: tasks.join(","), tasks };
}

let child = null;
let shuttingDown = false;

/**
 * @param {string} signal
 */
function stopChild(signal) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  if (IS_WINDOWS) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // The child already exited.
    }
  }
}

/**
 * @param {string} reason
 * @param {number} [code]
 */
function shutdown(reason, code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  if (reason) {
    console.error(`[dev] ${reason}`);
  }
  stopChild("SIGTERM");
  releaseLock();
  process.exitCode = code;
}

function start() {
  const { label, tasks } = parseTarget(process.argv.slice(2));
  acquireLock(label);

  const ports = portsForTasks(tasks);
  if (ports.length > 0) {
    console.log(`[dev] freeing ports ${ports.join(", ")}`);
    for (const port of ports) {
      if (!killDevPort(port, { quiet: true })) {
        console.warn(`[dev] port ${port} is still in use; the task may fail to bind`);
      }
    }
  }

  const args = ["exec", "turbo", "run", ...tasks, "--concurrency", "20"];
  const commandLine = ["pnpm", ...args].map(shellQuote).join(" ");
  console.log(`[dev] target: ${label}`);
  console.log(`[dev] run: ${commandLine}`);

  child = spawn(commandLine, {
    cwd: repoRoot,
    detached: !IS_WINDOWS,
    shell: true,
    stdio: "inherit",
  });

  child.on("error", (error) => {
    shutdown(`could not start turbo: ${error.message}`, 1);
  });

  child.on("exit", (code, signal) => {
    const outcome = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.log(`[dev] turbo exited with ${outcome}`);
    releaseLock();
    process.exitCode = code ?? 0;
  });
}

process.on("SIGINT", () => {
  shutdown("stopping (SIGINT)");
});
process.on("SIGTERM", () => {
  shutdown("stopping (SIGTERM)");
});
process.on("uncaughtException", (error) => {
  shutdown(`unexpected error: ${error.message}`, 1);
});
process.on("exit", () => {
  releaseLock();
});

start();
