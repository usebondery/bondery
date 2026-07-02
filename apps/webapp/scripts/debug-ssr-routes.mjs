/**
 * Debug: hit SSR routes on production next start and log status + TDZ stderr.
 */
import { appendFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webappRoot = join(__dirname, "..");
const repoRoot = join(webappRoot, "..", "..");
const LOG_PATH = join(repoRoot, "debug-e4d508.log");
const INGEST = "http://127.0.0.1:7325/ingest/1bde7139-b916-4337-a35d-3f405e2a5241";
const SESSION = "e4d508";

function log(hypothesisId, location, message, data = {}) {
  const entry = {
    sessionId: SESSION,
    runId: process.env.DEBUG_RUN_ID ?? "ssr-routes",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION },
    body: JSON.stringify(entry),
  }).catch(() => {});
}

if (!existsSync(join(webappRoot, ".next"))) {
  console.error("missing .next — run npm run build -w webapp");
  process.exit(1);
}

const port = 31_500 + Math.floor(Math.random() * 500);
const routes = [
  { path: "/login", hypothesisId: "D" },
  { path: "/app/home", hypothesisId: "D" },
  { path: "/app/unavailable", hypothesisId: "D" },
];

const stderrChunks = [];
const child = spawn("npx", ["next", "start", "--port", String(port)], {
  cwd: webappRoot,
  stdio: ["ignore", "pipe", "pipe"],
  shell: true,
});

child.stderr?.on("data", (chunk) => {
  const text = String(chunk);
  stderrChunks.push(text);
  if (/before initialization/i.test(text)) {
    log("D", "debug-ssr-routes.mjs", "TDZ stderr detected", { snippet: text.slice(0, 500) });
  }
});

function killChild() {
  if (!child.killed) child.kill("SIGTERM");
}

const deadline = Date.now() + 45_000;
while (Date.now() < deadline) {
  try {
    await fetch(`http://127.0.0.1:${port}/login`);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 400));
  }
}

for (const route of routes) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}${route.path}`, { redirect: "manual" });
    const bodySnippet = (await response.text()).slice(0, 200);
    log(route.hypothesisId, "debug-ssr-routes.mjs", "route response", {
      path: route.path,
      status: response.status,
      bodySnippet,
    });
    console.log(`${route.path} -> ${response.status}`);
  } catch (error) {
    log(route.hypothesisId, "debug-ssr-routes.mjs", "route fetch failed", {
      path: route.path,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const stderr = stderrChunks.join("");
if (/before initialization/i.test(stderr)) {
  log("D", "debug-ssr-routes.mjs", "TDZ in server stderr", { stderr: stderr.slice(0, 2000) });
  console.error("TDZ detected in stderr");
  process.exitCode = 1;
}

killChild();
log("INIT", "debug-ssr-routes.mjs", "ssr route probe complete", { port });
