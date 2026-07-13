/**
 * Smoke test: production Next server must boot and serve /login without TDZ errors.
 * Requires a prior `next build` in apps/webapp.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webappRoot = join(__dirname, "..");
const nextDir = join(webappRoot, ".next");

if (!existsSync(nextDir)) {
  console.error("smoke-ssr-boot: missing .next build output — run `npm run build -w webapp` first");
  process.exit(1);
}

const port = 31_000 + Math.floor(Math.random() * 1000);
const url = `http://127.0.0.1:${port}/login`;
const stderrChunks = [];

const child = spawn("npx", ["next", "start", "--port", String(port)], {
  cwd: webappRoot,
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});

child.stderr?.on("data", (chunk) => {
  stderrChunks.push(String(chunk));
});

function killChild() {
  if (!child.killed) {
    child.kill("SIGTERM");
  }
}

const timeout = setTimeout(() => {
  console.error("smoke-ssr-boot: timed out waiting for /login");
  killChild();
  process.exit(1);
}, 60_000);

async function waitForReady() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const stderr = stderrChunks.join("");
    if (/before initialization/i.test(stderr)) {
      throw new Error(`SSR module init failed:\n${stderr}`);
    }
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        return;
      }
    } catch {
      // server still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not return 200 for ${url}\n${stderrChunks.join("")}`);
}

try {
  await waitForReady();
  console.log(`smoke-ssr-boot: OK (${url})`);
} catch (error) {
  console.error("smoke-ssr-boot: failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  killChild();
}
