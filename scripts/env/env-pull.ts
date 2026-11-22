/**
 * Pull shared team secrets from Infisical into root `.env.local`.
 *
 *   pnpm run env:pull
 *
 * Prerequisites:
 *   - Infisical CLI installed and logged in (`infisical login`)
 *   - `.infisical.json` at repo root (committed; copy from `.infisical.json.example` only for a different project)
 *
 * Which keys are pulled is defined by `syncable: true` on manifest entries.
 */

import { execSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCliLogger } from "@bondery/helpers/cli";
import { getSyncableEnvVars, parseEnvContent } from "../../packages/helpers/src/env/index.ts";
import { upsertEnvAssignments } from "./env-upsert.js";

const PATTERN_5C723F5C6E_RE = /\r?\n/;

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const log = createCliLogger("env:pull");

const ROOT_ENV = join(repoRoot, ".env.local");
const ROOT_ENV_EXAMPLE = join(repoRoot, ".env.local.example");
const INFISICAL_CONFIG = join(repoRoot, ".infisical.json");
const INFISICAL_CONFIG_EXAMPLE = join(repoRoot, ".infisical.json.example");

const INFISICAL_ENV_SLUGS = ["development", "staging", "production"] as const;

/** Renamed slugs — warn so local `.infisical.json` stays in sync with Infisical UI. */
const LEGACY_INFISICAL_ENV_SLUGS: Record<string, (typeof INFISICAL_ENV_SLUGS)[number]> = {
  dev: "development",
  prod: "production",
};

type InfisicalConfig = {
  defaultEnvironment?: string;
  domain?: string;
  projectId?: string;
  /** Infisical folder path for env:pull (default `/`). Ignored by the Infisical CLI. */
  secretsPath?: string;
  /** Legacy Infisical project config field (same value as projectId). */
  workspaceId?: string;
};

type InfisicalPullTarget = {
  environment: string;
  projectId: string;
  secretsPath: string;
  domain?: string;
};

function run(cmd: string) {
  execSync(cmd, { cwd: repoRoot, stdio: "inherit" });
}

function commandExists(name: string): boolean {
  const check = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(check, [name], {
    encoding: "utf-8",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

function resolveInfisicalExecutable(): { command: string; shell: boolean } {
  if (process.platform !== "win32") {
    return { command: "infisical", shell: false };
  }

  const where = spawnSync("cmd", ["/c", "where", "infisical.cmd"], { encoding: "utf-8" });
  const cmdPath = where.stdout?.trim().split(PATTERN_5C723F5C6E_RE)[0]?.trim();
  if (cmdPath) {
    const exe = join(dirname(cmdPath), "node_modules", "@infisical", "cli", "bin", "infisical.exe");
    if (existsSync(exe)) {
      return { command: exe, shell: false };
    }
  }

  return { command: "infisical.cmd", shell: true };
}

function readInfisicalConfig(): InfisicalPullTarget {
  if (!existsSync(INFISICAL_CONFIG)) {
    log.error(`Missing ${INFISICAL_CONFIG}`);
    log.info("Restore .infisical.json from git, or copy .infisical.json.example and set projectId");
    process.exitCode = 1;
    return;
  }

  const raw = JSON.parse(readFileSync(INFISICAL_CONFIG, "utf-8")) as InfisicalConfig;
  const projectId = raw.projectId ?? raw.workspaceId;
  if (!projectId) {
    log.error(".infisical.json must include projectId (or workspaceId)");
    process.exitCode = 1;
    return;
  }

  const environment = raw.defaultEnvironment;
  if (!environment) {
    log.error(".infisical.json must include defaultEnvironment (Infisical slug, e.g. development)");
    process.exitCode = 1;
    return;
  }

  if (environment.includes(" ")) {
    log.warn(
      `defaultEnvironment "${environment}" contains spaces — Infisical slugs are lowercase single tokens (e.g. development)`,
    );
  }

  const legacyReplacement = LEGACY_INFISICAL_ENV_SLUGS[environment];
  if (legacyReplacement) {
    log.warn(
      `defaultEnvironment "${environment}" is a legacy slug — update .infisical.json to "${legacyReplacement}"`,
    );
  } else if (!INFISICAL_ENV_SLUGS.includes(environment as (typeof INFISICAL_ENV_SLUGS)[number])) {
    log.warn(
      `defaultEnvironment "${environment}" is not a known bondery-secrets slug (${INFISICAL_ENV_SLUGS.join(", ")})`,
    );
  }

  return {
    domain: raw.domain,
    environment,
    projectId,
    secretsPath: raw.secretsPath ?? "/",
  };
}

function exportInfisicalSecrets(config: InfisicalPullTarget): Record<string, string> {
  const { command, shell } = resolveInfisicalExecutable();
  const args = [
    "export",
    "--format=dotenv",
    `--projectId=${config.projectId}`,
    `--env=${config.environment}`,
    `--path=${config.secretsPath}`,
  ];

  if (config.domain) {
    args.push(`--domain=${config.domain}`);
  }

  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf-8",
    shell,
  });

  if (result.error) {
    log.error(`Failed to run Infisical CLI: ${result.error.message}`);
    if (process.platform === "win32") {
      log.info("Reinstall: pnpm install -g @infisical/cli");
    }
    process.exitCode = 1;
    return;
  }

  if (result.status !== 0) {
    log.error("infisical export failed");
    const detail = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    if (detail) {
      for (const line of detail.split("\n")) {
        log.info(line);
      }
    } else {
      log.info(`Command: ${command} ${args.join(" ")}`);
    }
    process.exitCode = result.status ?? 1;
    return;
  }

  return parseEnvContent(result.stdout ?? "");
}

function ensureRootEnvFile() {
  if (existsSync(ROOT_ENV)) {
    return;
  }
  if (!existsSync(ROOT_ENV_EXAMPLE)) {
    log.error("Missing .env.local — run pnpm run setup:dev first");
    process.exitCode = 1;
    return;
  }
  copyFileSync(ROOT_ENV_EXAMPLE, ROOT_ENV);
  log.warn("Created .env.local from example");
}

function main() {
  const syncable = getSyncableEnvVars();
  if (syncable.length === 0) {
    log.error("No manifest entries have syncable: true — nothing to pull");
    process.exitCode = 1;
    return;
  }

  if (!commandExists("infisical")) {
    log.error("Infisical CLI not found on PATH");
    log.info("Install: https://infisical.com/docs/cli/overview");
    process.exitCode = 1;
    return;
  }

  if (!existsSync(INFISICAL_CONFIG_EXAMPLE)) {
    log.warn("Missing .infisical.json.example — see docs/contributing/environment.mdx");
  }

  const infisical = readInfisicalConfig();
  ensureRootEnvFile();

  log.step(1, 2, `Export from Infisical (${infisical.environment}${infisical.secretsPath})`);
  const remote = exportInfisicalSecrets(infisical);

  const updates: Record<string, string> = {};
  const missing: string[] = [];

  for (const entry of syncable) {
    const value = remote[entry.canonical];
    if (value === undefined || value === "") {
      missing.push(entry.canonical);
      continue;
    }
    updates[entry.canonical] = value;
  }

  if (Object.keys(updates).length === 0) {
    log.error("No syncable keys found in Infisical export");
    if (missing.length > 0) {
      log.info(`Expected: ${missing.join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  upsertEnvAssignments(ROOT_ENV, updates);
  log.success(`Updated ${Object.keys(updates).length} key(s) in .env.local`);
  for (const key of Object.keys(updates).sort()) {
    log.info(`  ${key}`);
  }

  if (missing.length > 0) {
    log.warn(`Not found in Infisical export: ${missing.join(", ")}`);
  }

  log.step(2, 2, "Sync app env files (development)");
  run("pnpm run env:development");
  log.success("env:pull complete");
}

main();
