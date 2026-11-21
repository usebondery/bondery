/**
 * Sync Infisical env (dokploySync keys) to Dokploy compose environment.
 *
 * Prerequisites: Infisical secrets-action has loaded keys into process.env.
 * Production sync: production Infisical only.
 * Beta (services-beta / website-beta): workflow fetches production (ops keys) then staging (app secrets),
 * restores BONDERY_OPS_DOKPLOY_* from production before running this script.
 *
 * Usage:
 *   node deploy/scripts/sync-infisical-to-dokploy.mjs --target website|website-beta|plausible|services|services-beta [--dry-run] [--redeploy]
 */

import { pathToFileURL } from "node:url";
import {
  collectDokploySyncRows,
  DOKPLOY_SYNC_TARGETS,
  getDokploySyncWebhookBranch,
  OPS_DOKPLOY_SYNC_CONFIG_KEYS,
  resolveDokploySyncPayloadTarget,
} from "@bondery/helpers/env";
import { parseEnvContent } from "@bondery/helpers/env/check-env";

/** @see scripts/env/env-file-format.ts */
export function quoteEnvValue(value) {
  if (/[\s#"'$\\]/.test(value) || value === "") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

const SHARED_DOKPLOY_CONFIG_KEYS = ["BONDERY_OPS_DOKPLOY_HOST", "BONDERY_OPS_DOKPLOY_API_KEY"];

/** @typedef {{ host: string; apiKey: string; composeId: string; deployWebhook: string; target: string; webhookKey: string }} DokployConfig */

/**
 * @param {string} target
 * @returns {target is keyof typeof DOKPLOY_SYNC_TARGETS}
 */
export function isDokploySyncTarget(target) {
  return Object.hasOwn(DOKPLOY_SYNC_TARGETS, target);
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {keyof typeof DOKPLOY_SYNC_TARGETS} target
 * @returns {DokployConfig}
 */
export function readDokployConfig(env, target) {
  const targetConfig = DOKPLOY_SYNC_TARGETS[target];
  const missing = [];

  for (const key of SHARED_DOKPLOY_CONFIG_KEYS) {
    const value = env[key]?.trim();
    if (!value) {
      missing.push(key);
    }
  }

  const composeId = env[targetConfig.composeIdKey]?.trim();
  if (!composeId) {
    missing.push(targetConfig.composeIdKey);
  }

  if (missing.length > 0) {
    console.error(
      `sync-infisical-to-dokploy: missing required Infisical keys for target "${target}":`,
    );
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
    process.exitCode = 1;
    return;
  }

  return {
    apiKey: env.BONDERY_OPS_DOKPLOY_API_KEY.trim(),
    composeId,
    deployWebhook: env[targetConfig.webhookKey]?.trim() ?? "",
    host: env.BONDERY_OPS_DOKPLOY_HOST.trim().replace(/\/$/, ""),
    target,
    webhookKey: targetConfig.webhookKey,
  };
}

/**
 * Keys written to Dokploy (never includes connection config keys).
 *
 * @param {Record<string, string | undefined>} env
 * @param {keyof typeof DOKPLOY_SYNC_TARGETS} target
 */
export function buildUploadPayload(env, target) {
  const payloadTarget = resolveDokploySyncPayloadTarget(target);
  const { missingRequired, rows } = collectDokploySyncRows(
    Object.fromEntries(
      Object.entries(env)
        .filter(([, value]) => value !== undefined)
        .map(([k, v]) => [k, v]),
    ),
    target,
  );

  if (missingRequired.length > 0) {
    console.error(
      `sync-infisical-to-dokploy: missing required production values for target "${target}" (payload ${payloadTarget}):`,
    );
    for (const key of missingRequired) {
      console.error(`  - ${key}`);
    }
    process.exitCode = 1;
    return;
  }

  const uploadKeys = rows.map((row) => row.key);
  for (const configKey of OPS_DOKPLOY_SYNC_CONFIG_KEYS) {
    if (uploadKeys.includes(configKey)) {
      console.error(
        `sync-infisical-to-dokploy: internal error — config key ${configKey} in upload payload`,
      );
      process.exitCode = 1;
      return;
    }
  }

  return { rows, uploadKeys };
}

/** @deprecated Use buildUploadPayload */
export function buildOpsUploadPayload(env) {
  return buildUploadPayload(env, "website");
}

/**
 * @param {Array<{ key: string; value: string }>} rows
 * @param {typeof quoteEnvValue} quote
 */
export function formatEnvPayload(rows, quote) {
  return rows.map((row) => `${row.key}=${quote(row.value)}`).join("\n");
}

/**
 * Merge sync updates into existing Dokploy env text (preserves unsynced keys).
 *
 * @param {string | null | undefined} existingEnv
 * @param {Array<{ key: string; value: string }>} rows
 * @param {typeof quoteEnvValue} quote
 */
export function mergeComposeEnv(existingEnv, rows, quote) {
  const merged = parseEnvContent(existingEnv ?? "");
  for (const row of rows) {
    merged[row.key] = row.value;
  }

  const keys = Object.keys(merged).sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "variant" }),
  );

  return keys.map((key) => `${key}=${quote(merged[key])}`).join("\n");
}

/** @deprecated Use mergeComposeEnv */
export function mergeOpsEnv(existingEnv, rows, quote) {
  return mergeComposeEnv(existingEnv, rows, quote);
}

/**
 * @param {DokployConfig} config
 */
export async function fetchComposeEnv(config) {
  const url = new URL("/api/compose.one", config.host);
  url.searchParams.set("composeId", config.composeId);

  const response = await fetch(url, {
    headers: {
      "x-api-key": config.apiKey,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`sync-infisical-to-dokploy: compose.one failed (${response.status}): ${body}`);
    process.exitCode = 1;
    return;
  }

  const data = await response.json();
  const env = data?.env ?? data?.result?.data?.env;
  return typeof env === "string" || env === null ? env : undefined;
}

/**
 * @param {DokployConfig} config
 * @param {string} envPayload
 */
export async function saveComposeEnv(config, envPayload) {
  const response = await fetch(new URL("/api/compose.saveEnvironment", config.host), {
    body: JSON.stringify({
      composeId: config.composeId,
      env: envPayload,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
    },
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `sync-infisical-to-dokploy: compose.saveEnvironment failed (${response.status}): ${body}`,
    );
    process.exitCode = 1;
  }
}

/**
 * GitHub push payload for Dokploy when watch paths are configured.
 *
 * @param {string} repository
 * @param {readonly string[]} pathSentinels
 * @param {string} [branch]
 */
export function buildDeployWebhookPayload(repository, pathSentinels, branch = "release") {
  return {
    commits: [
      {
        added: [],
        modified: [...pathSentinels],
        removed: [],
      },
    ],
    ref: `refs/heads/${branch}`,
    repository: { full_name: repository },
  };
}

/**
 * @param {string} webhookUrl
 * @param {string} repository
 * @param {readonly string[]} pathSentinels
 * @param {string} [branch]
 */
export async function triggerDeployWebhook(webhookUrl, repository, pathSentinels, branch) {
  const response = await fetch(webhookUrl, {
    body: JSON.stringify(buildDeployWebhookPayload(repository, pathSentinels, branch)),
    headers: {
      "Content-Type": "application/json",
      "X-GitHub-Event": "push",
    },
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`sync-infisical-to-dokploy: deploy webhook failed (${response.status}): ${body}`);
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  let dryRun = false;
  let redeploy = false;
  let target = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--redeploy") {
      redeploy = true;
    } else if (arg === "--target") {
      target = argv[i + 1] ?? "";
      i += 1;
    }
  }

  return { dryRun, redeploy, target };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.target === "ops") {
    console.error("sync-infisical-to-dokploy: --target ops was renamed to --target website");
    process.exitCode = 1;
    return;
  }

  if (!isDokploySyncTarget(args.target)) {
    console.error(
      "sync-infisical-to-dokploy: --target must be website, website-beta, plausible, services, or services-beta",
    );
    process.exitCode = 1;
    return;
  }

  const config = readDokployConfig(process.env, args.target);
  const { rows, uploadKeys } = buildUploadPayload(process.env, args.target);
  const existingEnv = args.dryRun ? null : await fetchComposeEnv(config);
  const envPayload = mergeComposeEnv(existingEnv, rows, quoteEnvValue);

  console.log(`sync-infisical-to-dokploy: target ${args.target}, upload keys:`);
  for (const key of uploadKeys) {
    console.log(`  - ${key}`);
  }

  if (args.dryRun) {
    console.log("sync-infisical-to-dokploy: dry run — skipping Dokploy API");
    return;
  }

  await saveComposeEnv(config, envPayload);
  console.log("sync-infisical-to-dokploy: saved compose environment");

  if (args.redeploy) {
    if (!config.deployWebhook) {
      console.error(
        `sync-infisical-to-dokploy: --redeploy requires ${config.webhookKey} in Infisical`,
      );
      process.exitCode = 1;
      return;
    }

    const repository =
      // biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub Actions runner env, not a turbo task input
      process.env.GITHUB_REPOSITORY ?? "usebondery/bondery";
    const pathSentinels = DOKPLOY_SYNC_TARGETS[args.target].webhookPathSentinels;
    const webhookBranch = getDokploySyncWebhookBranch(args.target);
    await triggerDeployWebhook(config.deployWebhook, repository, pathSentinels, webhookBranch);
    console.log("sync-infisical-to-dokploy: triggered deploy webhook");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
