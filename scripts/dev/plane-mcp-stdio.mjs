#!/usr/bin/env node
/**
 * Stdio entrypoint for Plane MCP. Cursor and Claude Code spawn this script; it loads
 * `.agents/mcp/plane.env.local` then runs `uvx plane-mcp-server stdio`.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadPlaneMcpEnv, PLANE_MCP_ENV_REL } from "./plane-mcp-env.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const parsed = loadPlaneMcpEnv(repoRoot);

if (!parsed.ok) {
  if (parsed.reason === "missing") {
    console.error(
      `Plane MCP: missing ${PLANE_MCP_ENV_REL}. Copy .agents/mcp/plane.env.local.example, or run pnpm run setup:worktree.`,
    );
  } else {
    console.error(
      `Plane MCP: set ${parsed.missing.join(" and ")} in ${PLANE_MCP_ENV_REL} (see plane.env.local.example).`,
    );
  }
  process.exitCode = 1;
} else {
  // biome-ignore lint/style/noProcessEnv: child inherits host env plus plane.env.local
  const childEnv = { ...process.env, ...parsed.env };

  const child = spawn("uvx", ["plane-mcp-server", "stdio"], {
    cwd: repoRoot,
    env: childEnv,
    stdio: "inherit",
  });

  child.on("error", (err) => {
    if ("code" in err && err.code === "ENOENT") {
      console.error(
        "Plane MCP: `uvx` not found. Install uv (https://docs.astral.sh/uv/) — Plane MCP stdio requires it.",
      );
    } else {
      console.error(`Plane MCP: failed to start: ${err.message}`);
    }
    process.exitCode = 1;
  });

  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}
