/**
 * Unified local env CLI.
 *
 * Day-to-day:
 *   pnpm run env                 → sync development + production locals → check root
 *   pnpm run env:development     → sync *.development.local (+ mobile/db .env.local)
 *   pnpm run env:production      → sync *.production.local (local prod-mode builds)
 *
 * First clone:
 *   pnpm run setup:dev
 *
 * Codegen / CI (not day-to-day DX):
 *   pnpm run env:sync              # build helpers → examples + turbo → check:versions
 *   pnpm run env:examples          # regenerate only (no helpers build / version check)
 *   pnpm run env:check             # regenerate + fail if git dirty
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCliLogger } from "@bondery/helpers/cli";
import {
  applyTransform,
  ENV_GROUP_GUIDES,
  ENV_MANIFEST,
  getAllRuntimeNames,
  getRuntimeNamesForTarget,
  parseEnvFile,
  resolveCanonicalValue,
  resolveExampleValue,
  SYNC_TARGETS,
  TURBO_SYSTEM_PASSTHROUGH,
} from "../../packages/helpers/src/env/index.ts";
import { infraPinCalver } from "../../packages/helpers/src/version/calver.ts";
import { readGitTags } from "../pkg/calver.mjs";
import { writeDeployExample } from "./env-deploy-example.js";
import { compareAscii, formatEnvFile, quoteEnvValue, sortEnvRows } from "./env-file-format.js";
import { writeOpsExample } from "./env-ops-example.js";
import { writePlausibleExample } from "./env-plausible-example.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const log = createCliLogger("env");

const ROOT_ENV = join(repoRoot, ".env.local");
const PACKAGE_JSON_PATH = join(repoRoot, "package.json");

function readPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf-8")) as { version?: string };
  return pkg.version ?? "";
}

type SyncMode = "development" | "production";

function parseArgs(argv) {
  return {
    all: argv.includes("--all"),
    check: argv.includes("--check"),
    development: argv.includes("--development"),
    dryRun: argv.includes("--dry-run"),
    only: (() => {
      const onlyArg = argv.find((a) => a.startsWith("--only="));
      if (!onlyArg) {
        return null;
      }
      return onlyArg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    })(),
    production: argv.includes("--production"),
    skipCheck: argv.includes("--skip-check"),
    writeExamples: argv.includes("--write-examples"),
    writeTurbo: argv.includes("--write-turbo"),
  };
}

function resolveSyncModes(flags): SyncMode[] {
  if (flags.all) {
    return ["development", "production"];
  }
  if (flags.production) {
    return ["production"];
  }
  return ["development"];
}

function collectTargetVars(targetId, rootEnv, useExamples) {
  const byKey = new Map();

  for (const entry of ENV_MANIFEST) {
    for (const target of entry.targets) {
      if (target.id !== targetId) {
        continue;
      }
      const key = target.runtimeName ?? entry.canonical;
      let value: string | undefined;
      if (useExamples) {
        if (target.deriveFrom) {
          const sourceEntry = ENV_MANIFEST.find((e) => e.canonical === target.deriveFrom);
          const sourceVal = sourceEntry?.exampleValue ?? "";
          value = applyTransform(target.transform, sourceVal);
        } else {
          value = entry.exampleValue;
        }
      } else {
        value = resolveCanonicalValue(rootEnv, entry, target);
      }
      if (value === undefined) {
        continue;
      }
      byKey.set(key, {
        description: entry.description,
        group: entry.group,
        key,
        value,
      });
    }
  }

  return [...byKey.values()].toSorted((a, b) => {
    if (a.group !== b.group) {
      return compareAscii(a.group, b.group);
    }
    return compareAscii(a.key, b.key);
  });
}

function mergeEnvFile(path, newVars, dryRun) {
  const existing = existsSync(path) ? parseEnvFile(path) : {};
  const knownKeys = new Set(Object.keys(newVars));
  const unknown = Object.entries(existing).filter(([k]) => !knownKeys.has(k));

  const rows = Object.entries(newVars).map(([key, value]) => {
    const entry = ENV_MANIFEST.find(
      (e) => e.canonical === key || e.targets.some((t) => (t.runtimeName ?? e.canonical) === key),
    );
    return {
      description: entry?.description ?? "",
      group: entry?.group ?? "Other",
      key,
      value,
    };
  });

  let body = formatEnvFile(sortEnvRows(rows), { groupGuides: ENV_GROUP_GUIDES });

  if (unknown.length > 0) {
    body += "\n# --- Preserved (not in manifest) ---\n";
    for (const [key, value] of unknown.toSorted(([a], [b]) => compareAscii(a, b))) {
      body += `${key}=${quoteEnvValue(value)}\n`;
    }
  }

  if (dryRun) {
    log.info(`Would write ${Object.keys(newVars).length} keys → ${path}`);
    return Object.keys(newVars).length;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf-8");
  return Object.keys(newVars).length;
}

function writeExamples(dryRun) {
  const packageVersion = readPackageVersion();
  const infraPinVersion = infraPinCalver(packageVersion, readGitTags(repoRoot));
  const rootRows = sortEnvRows(
    ENV_MANIFEST.filter((e) => !e.omitFromRootExample).map((e) => ({
      description: e.description,
      group: e.group,
      key: e.canonical,
      value: e.exampleValue,
    })),
  );
  const rootPath = join(repoRoot, ".env.local.example");
  if (!dryRun) {
    writeFileSync(rootPath, formatEnvFile(rootRows, { groupGuides: ENV_GROUP_GUIDES }), "utf-8");
  }
  log.info(`${dryRun ? "Would write" : "Wrote"} ${rootPath}`);

  writeDeployExample(repoRoot, dryRun, infraPinVersion, log);
  writeOpsExample(repoRoot, dryRun, packageVersion, log, infraPinVersion);
  writePlausibleExample(repoRoot, dryRun, log);

  for (const target of SYNC_TARGETS) {
    const rows = sortEnvRows(collectTargetVars(target.id, {}, true));
    const examplePath = join(repoRoot, target.exampleFile);
    if (!dryRun) {
      writeFileSync(examplePath, formatEnvFile(rows, { groupGuides: ENV_GROUP_GUIDES }), "utf-8");
    }
    log.info(`${dryRun ? "Would write" : "Wrote"} ${examplePath}`);

    if (target.productionExampleFile) {
      const prodRows = rows.map((r) => {
        const entry = ENV_MANIFEST.find(
          (e) =>
            e.canonical === r.key ||
            e.targets.some((t) => (t.runtimeName ?? e.canonical) === r.key),
        );
        const value = entry ? resolveExampleValue(entry, "production") : r.value;
        return { ...r, value };
      });
      const prodPath = join(repoRoot, target.productionExampleFile);
      if (!dryRun) {
        writeFileSync(
          prodPath,
          formatEnvFile(prodRows, { groupGuides: ENV_GROUP_GUIDES }),
          "utf-8",
        );
      }
      log.info(`${dryRun ? "Would write" : "Wrote"} ${prodPath}`);
    }
  }
}

function sortObjectKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    const sorted = Object.entries(value as Record<string, unknown>)
      .toSorted(([a], [b]) => compareAscii(a, b))
      .map(([key, nested]) => [key, sortObjectKeys(nested)]);
    return Object.fromEntries(sorted) as T;
  }
  return value;
}

function writeTurbo(dryRun) {
  const turboPath = join(repoRoot, "turbo.json");
  const turbo = JSON.parse(readFileSync(turboPath, "utf-8"));

  const globalPassThroughEnv = [...TURBO_SYSTEM_PASSTHROUGH, ...getAllRuntimeNames()];
  turbo.globalPassThroughEnv = [...new Set(globalPassThroughEnv)].toSorted();

  const packageEnv = {
    api: getRuntimeNamesForTarget("api"),
    "chrome-extension": [
      ...getRuntimeNamesForTarget("chrome-extension"),
      "BONDERY_INFRA_CHROME_EXTENSION_ID",
      "BONDERY_OPS_CHROME_PUBLISHER_ID",
      "PRIVATE_CHROME_SERVICE_ACCOUNT_KEY_JSON",
      "PRIVATE_CHROME_PRIVATE_SIGNING_KEY",
      "GITHUB_ACTIONS",
      "CI",
    ],
    mobile: [...getRuntimeNamesForTarget("mobile"), "METRO_MAX_WORKERS"],
    webapp: getRuntimeNamesForTarget("webapp"),
    website: getRuntimeNamesForTarget("website"),
  };

  turbo.tasks ??= {};

  const baseBuild = turbo.tasks.build ?? {};
  const buildInherit = {
    dependsOn: baseBuild.dependsOn ?? ["^build"],
    inputs: baseBuild.inputs,
    outputs: baseBuild.outputs,
    passThroughEnv: baseBuild.passThroughEnv,
  };
  const baseDev = turbo.tasks.dev ?? {};
  const devInherit = {
    cache: baseDev.cache ?? false,
    dependsOn: baseDev.dependsOn,
    inputs: baseDev.inputs,
    persistent: baseDev.persistent ?? true,
  };

  for (const taskName of ["build", "dev"]) {
    const task = turbo.tasks[taskName];
    if (task && "env" in task) {
      delete task.env;
    }
  }

  for (const [pkg, env] of Object.entries(packageEnv)) {
    for (const taskName of ["build", "dev"]) {
      const key = `${pkg}#${taskName}`;
      const existing = turbo.tasks[key] ?? {};
      const inherit = taskName === "build" ? buildInherit : devInherit;
      turbo.tasks[key] = {
        ...inherit,
        ...existing,
        dependsOn: existing.dependsOn ?? inherit.dependsOn,
        env: [...new Set(env)].toSorted(),
      };
    }
  }

  const out = `${JSON.stringify(sortObjectKeys(turbo), null, 2)}\n`;
  if (dryRun) {
    log.info("Would update turbo.json env sections");
    return;
  }
  writeFileSync(turboPath, out, "utf-8");
  execSync("pnpm exec biome check --write turbo.json", { cwd: repoRoot, stdio: "pipe" });
  log.success("Updated turbo.json env sections from manifest");
}

function _upsertEnvFile(path, updates) {
  if (!existsSync(path)) {
    const lines = Object.entries(updates).map(([k, v]) => `${k}=${quoteEnvValue(v)}`);
    writeFileSync(path, `${lines.join("\n")}\n`, "utf-8");
    return;
  }

  let content = readFileSync(path, "utf-8");
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${quoteEnvValue(value)}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(content)) {
      content = content.replace(re, line);
    } else {
      content = `${content.trimEnd()}\n${line}\n`;
    }
  }
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`, "utf-8");
}

function syncApps(flags, mode: SyncMode) {
  if (!existsSync(ROOT_ENV)) {
    log.error("Missing .env.local — copy from .env.local.example:");
    log.info("  cp .env.local.example .env.local");
    process.exit(1);
  }

  const rootEnv = parseEnvFile(ROOT_ENV);
  const targets = SYNC_TARGETS.filter((t) => !flags.only || flags.only.includes(t.id));
  const summary = [];

  for (const target of targets) {
    const relPath = mode === "production" ? target.productionFile : target.devFile;
    if (!relPath) {
      continue;
    }
    const rows = collectTargetVars(target.id, rootEnv, false);
    const asRecord = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const path = join(repoRoot, relPath);
    const count = mergeEnvFile(path, asRecord, flags.dryRun);
    summary.push({ file: relPath, mode, target: target.id, vars: count });
  }

  if (summary.length > 0) {
    log.table(summary);
    log.success(
      flags.dryRun
        ? `Dry run: ${summary.length} ${mode} targets`
        : `Synced ${summary.length} ${mode} targets`,
    );
  }
}

function validatePostgresRootEnv(rootEnv: Record<string, string>) {
  if (rootEnv.DATABASE_URL) {
    log.error(
      "Remove DATABASE_URL from root .env.local — pnpm run env derives it from BONDERY_PRIVATE_POSTGRES_PASSWORD",
    );
    process.exit(1);
  }

  if (!rootEnv.BONDERY_PRIVATE_POSTGRES_PASSWORD) {
    log.error("Missing BONDERY_PRIVATE_POSTGRES_PASSWORD in .env.local");
    process.exit(1);
  }
}

function checkRoot(environment: SyncMode) {
  if (!existsSync(ROOT_ENV)) {
    log.error("Missing .env.local — run: pnpm run setup:dev");
    process.exit(1);
  }

  const rootEnv = parseEnvFile(ROOT_ENV);
  const missingRoot = [];

  for (const entry of ENV_MANIFEST) {
    if (!entry.requiredIn.includes(environment)) {
      continue;
    }
    const needsRoot = entry.targets.some((t) => !t.deriveFrom);
    if (!needsRoot) {
      continue;
    }
    if (!rootEnv[entry.canonical]) {
      missingRoot.push(entry.canonical);
    }
  }

  if (missingRoot.length > 0) {
    log.error(`Missing required variables in .env.local (${environment}):`);
    for (const name of missingRoot) {
      log.error(`  ${name}`);
    }
    process.exit(1);
  }

  if (environment === "development") {
    validatePostgresRootEnv(rootEnv);
  }

  log.success(`Root .env.local has all ${environment} required variables`);

  for (const target of SYNC_TARGETS) {
    const relPath = environment === "production" ? target.productionFile : target.devFile;
    if (!relPath) {
      continue;
    }
    const path = join(repoRoot, relPath);
    if (!existsSync(path)) {
      log.warn(`Missing ${relPath} — run pnpm run env`);
    }
  }
}

function assertGeneratedFresh() {
  const diff = execSync(
    "git diff --name-only -- .env.local.example turbo.json 'apps/**/.env*.example' 'apps/**/.env.example' deploy/bondery/.env.example deploy/ops/.env.example",
    { cwd: repoRoot, encoding: "utf-8" },
  ).trim();

  if (diff) {
    log.error("Generated env files / turbo.json are stale. Commit the updates:");
    for (const line of diff.split("\n")) {
      log.error(`  ${line}`);
    }
    try {
      const patch = execSync(
        "git diff -- .env.local.example turbo.json 'apps/**/.env*.example' 'apps/**/.env.example' deploy/bondery/.env.example deploy/ops/.env.example",
        { cwd: repoRoot, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
      ).trim();
      if (patch) {
        log.error(patch.slice(0, 8000));
      }
    } catch {
      // Best-effort diff for CI logs.
    }
    process.exit(1);
  }

  log.success("Env examples, deploy/ops examples, and turbo.json env sections match the manifest");
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const argv = process.argv.slice(2);

  if (flags.check) {
    writeExamples(false);
    writeTurbo(false);
    assertGeneratedFresh();
    return;
  }

  const codegenOnly =
    (flags.writeExamples || flags.writeTurbo) &&
    !argv.some((a) => a.startsWith("--only=")) &&
    argv.every(
      (a) =>
        a === "--write-examples" ||
        a === "--write-turbo" ||
        a === "--dry-run" ||
        a === "--skip-check" ||
        a === "--all" ||
        a === "--development" ||
        a === "--production",
    );

  if (flags.writeExamples) {
    writeExamples(flags.dryRun);
  }
  if (flags.writeTurbo) {
    writeTurbo(flags.dryRun);
  }
  if (codegenOnly) {
    return;
  }

  const modes = resolveSyncModes(flags);

  for (const mode of modes) {
    syncApps(flags, mode);
  }
  if (!flags.skipCheck && !flags.dryRun) {
    for (const mode of modes) {
      checkRoot(mode);
    }
  }
}

main();
