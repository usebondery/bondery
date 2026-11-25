/**
 * Loads `.agents/mcp/plane.env.local` for the Plane stdio MCP wrapper.
 * Not used by the Bondery app runtime.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLANE_MCP_ENV_REL = ".agents/mcp/plane.env.local";

const RE_PLANE_API_KEY = /^PLANE_API_KEY=(?<group1>.*)$/mu;
const RE_PLANE_PAT = /^PLANE_PAT=(?<group1>.*)$/mu;
const RE_PLANE_WORKSPACE_SLUG = /^PLANE_WORKSPACE_SLUG=(?<group1>.*)$/mu;
const RE_PLANE_API_KEY_EMPTY = /^PLANE_API_KEY=\s*$/mu;
const RE_PLANE_WORKSPACE_SLUG_EMPTY = /^PLANE_WORKSPACE_SLUG=\s*$/mu;
const RE_PLANE_WORKSPACE_SLUG_LINE = /^PLANE_WORKSPACE_SLUG=.*$/mu;

/**
 * @param {string} line
 * @returns {[string, string] | null}
 */
function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  const eq = trimmed.indexOf("=");
  if (eq <= 0) {
    return null;
  }
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

/** @param {string} repoRoot */
function planeMcpEnvPath(repoRoot) {
  return join(repoRoot, PLANE_MCP_ENV_REL);
}

/**
 * @param {string} filePath
 * @returns {{ ok: true; env: Record<string, string>; filePath: string } | { ok: false; filePath: string; reason: string; missing?: string[] }}
 */
function parsePlaneEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return { filePath, ok: false, reason: "missing" };
  }
  /** @type {Record<string, string>} */
  const env = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const pair = parseEnvLine(line);
    if (pair) {
      const [key, value] = pair;
      env[key] = value;
    }
  }
  if (env.PLANE_PAT && !env.PLANE_API_KEY) {
    env.PLANE_API_KEY = env.PLANE_PAT;
  }
  if (!env.PLANE_API_KEY || !env.PLANE_WORKSPACE_SLUG) {
    return {
      filePath,
      missing: [
        !env.PLANE_API_KEY ? "PLANE_API_KEY" : null,
        !env.PLANE_WORKSPACE_SLUG ? "PLANE_WORKSPACE_SLUG" : null,
      ].filter((key) => key !== null),
      ok: false,
      reason: "incomplete",
    };
  }
  return { env, filePath, ok: true };
}

/** @param {string} [startDir] Defaults to this script's repo root. */
function loadPlaneMcpEnv(startDir) {
  const repoRoot = startDir ?? join(dirname(fileURLToPath(import.meta.url)), "../..");
  return parsePlaneEnvFile(planeMcpEnvPath(repoRoot));
}

/** @param {string} repoRoot @param {string} planeTarget */
function migratePlaneEnvFromRootLocal(repoRoot, planeTarget) {
  const rootEnv = join(repoRoot, ".env.local");
  if (!existsSync(rootEnv) || !existsSync(planeTarget)) {
    return;
  }
  const text = readFileSync(rootEnv, "utf-8");
  const pat = text.match(RE_PLANE_API_KEY)?.[1]?.trim() ?? text.match(RE_PLANE_PAT)?.[1]?.trim();
  const slug = text.match(RE_PLANE_WORKSPACE_SLUG)?.[1]?.trim();
  if (!pat && !slug) {
    return;
  }
  let planeText = readFileSync(planeTarget, "utf-8");
  if (pat && RE_PLANE_API_KEY_EMPTY.test(planeText)) {
    planeText = planeText.replace(RE_PLANE_API_KEY_EMPTY, `PLANE_API_KEY=${pat}`);
  }
  if (slug && RE_PLANE_WORKSPACE_SLUG_EMPTY.test(planeText)) {
    planeText = planeText.replace(RE_PLANE_WORKSPACE_SLUG_LINE, `PLANE_WORKSPACE_SLUG=${slug}`);
  }
  writeFileSync(planeTarget, planeText);
  console.log("Filled Plane MCP env from root .env.local (migrate PLANE_* once)");
}

/** @param {string} repoRoot @param {string | null} primaryRoot */
function seedPlaneMcpEnv(repoRoot, primaryRoot) {
  const planeTarget = planeMcpEnvPath(repoRoot);
  const planeExample = join(repoRoot, ".agents/mcp/plane.env.local.example");
  const planePrimary = primaryRoot ? planeMcpEnvPath(primaryRoot) : null;

  if (existsSync(planeTarget)) {
    console.log("plane.env.local already exists, keeping it");
    return;
  }
  mkdirSync(dirname(planeTarget), { recursive: true });
  if (planePrimary && primaryRoot !== repoRoot && existsSync(planePrimary)) {
    copyFileSync(planePrimary, planeTarget);
    console.log(`Copied plane.env.local from ${primaryRoot}`);
    return;
  }
  if (existsSync(planeExample)) {
    copyFileSync(planeExample, planeTarget);
    console.log("Created plane.env.local from example");
    migratePlaneEnvFromRootLocal(repoRoot, planeTarget);
    return;
  }
  console.log("No plane.env.local.example; skipping Plane MCP env seed");
}

export { loadPlaneMcpEnv, PLANE_MCP_ENV_REL, parsePlaneEnvFile, planeMcpEnvPath, seedPlaneMcpEnv };
