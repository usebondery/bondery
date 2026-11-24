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

const ENV_VALUE_NEEDS_QUOTES_RE = /[\s#"'$\\]/;
const TRAILING_SLASH_RE = /\/$/;

/** @see scripts/env/env-file-format.ts */
function quoteEnvValue(value) {
  if (ENV_VALUE_NEEDS_QUOTES_RE.test(value) || value === "") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

const SHARED_DOKPLOY_CONFIG_KEYS = ["BONDERY_OPS_DOKPLOY_HOST", "BONDERY_OPS_DOKPLOY_API_KEY"];

/**
 * @typedef {{ host: string; apiKey: string; composeId: string; deployWebhook: string; target: string; webhookKey: string }} DokployConfig
 */

/**
 * One shape for "here is the data" or "here is why it failed".
 *
 * Helpers return a result and never touch `process.exitCode`, so a test asserts on the value
 * instead of stubbing `process.exit`. Only `main` reports and sets the exit code, once, at the
 * edge: a command that fails midway through a sequence of calls would otherwise leave the process
 * marked failed for a reason no caller can see.
 *
 * @template T
 * @param {T} value
 * @returns {{ ok: true; value: T }}
 */
function ok(value) {
  return { ok: true, value };
}

/**
 * @param {string[]} problems lines to print, already prefixed for the operator
 * @returns {{ ok: false; problems: string[] }}
 */
function failed(problems) {
  return { ok: false, problems };
}

/**
 * @param {string} target
 * @returns {target is keyof typeof DOKPLOY_SYNC_TARGETS}
 */
function isDokploySyncTarget(target) {
  return Object.hasOwn(DOKPLOY_SYNC_TARGETS, target);
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {keyof typeof DOKPLOY_SYNC_TARGETS} target
 * @returns {{ ok: true; value: DokployConfig } | { ok: false; problems: string[] }}
 */
function readDokployConfig(env, target) {
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
    return failed([
      `sync-infisical-to-dokploy: missing required Infisical keys for target "${target}":`,
      ...missing.map((key) => `  - ${key}`),
    ]);
  }

  return ok({
    apiKey: env.BONDERY_OPS_DOKPLOY_API_KEY.trim(),
    composeId,
    deployWebhook: env[targetConfig.webhookKey]?.trim() ?? "",
    host: env.BONDERY_OPS_DOKPLOY_HOST.trim().replace(TRAILING_SLASH_RE, ""),
    target,
    webhookKey: targetConfig.webhookKey,
  });
}

/**
 * Keys written to Dokploy (never includes connection config keys).
 *
 * @param {Record<string, string | undefined>} env
 * @param {keyof typeof DOKPLOY_SYNC_TARGETS} target
 * @returns {{ ok: true; value: { rows: Array<{ key: string; value: string }>; uploadKeys: string[] } } | { ok: false; problems: string[] }}
 */
function buildUploadPayload(env, target) {
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
    return failed([
      `sync-infisical-to-dokploy: missing required production values for target "${target}" (payload ${payloadTarget}):`,
      ...missingRequired.map((key) => `  - ${key}`),
    ]);
  }

  const uploadKeys = rows.map((row) => row.key);
  for (const configKey of OPS_DOKPLOY_SYNC_CONFIG_KEYS) {
    if (uploadKeys.includes(configKey)) {
      return failed([
        `sync-infisical-to-dokploy: internal error — config key ${configKey} in upload payload`,
      ]);
    }
  }

  return ok({ rows, uploadKeys });
}

/** @deprecated Use buildUploadPayload */
function buildOpsUploadPayload(env) {
  return buildUploadPayload(env, "website");
}

/**
 * @param {Array<{ key: string; value: string }>} rows
 * @param {typeof quoteEnvValue} quote
 */
function formatEnvPayload(rows, quote) {
  return rows.map((row) => `${row.key}=${quote(row.value)}`).join("\n");
}

/**
 * Merge sync updates into existing Dokploy env text (preserves unsynced keys).
 *
 * @param {string | null | undefined} existingEnv
 * @param {Array<{ key: string; value: string }>} rows
 * @param {typeof quoteEnvValue} quote
 */
function mergeComposeEnv(existingEnv, rows, quote) {
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
function mergeOpsEnv(existingEnv, rows, quote) {
  return mergeComposeEnv(existingEnv, rows, quote);
}

/**
 * @param {DokployConfig} config
 * @returns {Promise<{ ok: true; value: string | null | undefined } | { ok: false; problems: string[] }>}
 */
async function fetchComposeEnv(config) {
  const url = new URL("/api/compose.one", config.host);
  url.searchParams.set("composeId", config.composeId);

  const response = await fetch(url, {
    headers: {
      "x-api-key": config.apiKey,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    return failed([`sync-infisical-to-dokploy: compose.one failed (${response.status}): ${body}`]);
  }

  const data = await response.json();
  const env = data?.env ?? data?.result?.data?.env;
  return ok(typeof env === "string" || env === null ? env : undefined);
}

/**
 * @param {DokployConfig} config
 * @param {string} envPayload
 * @returns {Promise<{ ok: true } | { ok: false; problems: string[] }>}
 */
async function saveComposeEnv(config, envPayload) {
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
    return failed([
      `sync-infisical-to-dokploy: compose.saveEnvironment failed (${response.status}): ${body}`,
    ]);
  }

  return ok(undefined);
}

/**
 * GitHub push payload for Dokploy when watch paths are configured.
 *
 * @param {string} repository
 * @param {readonly string[]} pathSentinels
 * @param {string} [branch]
 */
function buildDeployWebhookPayload(repository, pathSentinels, branch = "release") {
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
 * @returns {Promise<{ ok: true } | { ok: false; problems: string[] }>}
 */
async function triggerDeployWebhook(webhookUrl, repository, pathSentinels, branch) {
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
    return failed([
      `sync-infisical-to-dokploy: deploy webhook failed (${response.status}): ${body}`,
    ]);
  }

  return ok(undefined);
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

/**
 * Prints the problems of a failed result and reports failure. Every early return in `main` goes
 * through here, so the exit code is set in one place.
 *
 * @param {{ ok: false; problems: string[] }} result
 */
function reportFailure(result) {
  for (const line of result.problems) {
    console.error(line);
  }
  process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.target === "ops") {
    reportFailure(
      failed(["sync-infisical-to-dokploy: --target ops was renamed to --target website"]),
    );
    return;
  }

  if (!isDokploySyncTarget(args.target)) {
    reportFailure(
      failed([
        "sync-infisical-to-dokploy: --target must be website, website-beta, plausible, services, or services-beta",
      ]),
    );
    return;
  }

  const configResult = readDokployConfig(process.env, args.target);
  if (!configResult.ok) {
    reportFailure(configResult);
    return;
  }
  const config = configResult.value;

  const payloadResult = buildUploadPayload(process.env, args.target);
  if (!payloadResult.ok) {
    reportFailure(payloadResult);
    return;
  }
  const { rows, uploadKeys } = payloadResult.value;

  const existingEnvResult = args.dryRun ? ok(null) : await fetchComposeEnv(config);
  if (!existingEnvResult.ok) {
    reportFailure(existingEnvResult);
    return;
  }
  const envPayload = mergeComposeEnv(existingEnvResult.value, rows, quoteEnvValue);

  console.log(`sync-infisical-to-dokploy: target ${args.target}, upload keys:`);
  for (const key of uploadKeys) {
    console.log(`  - ${key}`);
  }

  if (args.dryRun) {
    console.log("sync-infisical-to-dokploy: dry run — skipping Dokploy API");
    return;
  }

  const saved = await saveComposeEnv(config, envPayload);
  if (!saved.ok) {
    reportFailure(saved);
    return;
  }
  console.log("sync-infisical-to-dokploy: saved compose environment");

  if (args.redeploy) {
    if (!config.deployWebhook) {
      reportFailure(
        failed([
          `sync-infisical-to-dokploy: --redeploy requires ${config.webhookKey} in Infisical`,
        ]),
      );
      return;
    }

    const repository =
      // biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub Actions runner env, not a turbo task input
      process.env.GITHUB_REPOSITORY ?? "usebondery/bondery";
    const pathSentinels = DOKPLOY_SYNC_TARGETS[args.target].webhookPathSentinels;
    const webhookBranch = getDokploySyncWebhookBranch(args.target);
    const triggered = await triggerDeployWebhook(
      config.deployWebhook,
      repository,
      pathSentinels,
      webhookBranch,
    );
    if (!triggered.ok) {
      reportFailure(triggered);
      return;
    }
    console.log("sync-infisical-to-dokploy: triggered deploy webhook");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

export {
  buildDeployWebhookPayload,
  buildOpsUploadPayload,
  buildUploadPayload,
  fetchComposeEnv,
  formatEnvPayload,
  isDokploySyncTarget,
  mergeComposeEnv,
  mergeOpsEnv,
  quoteEnvValue,
  readDokployConfig,
  saveComposeEnv,
  triggerDeployWebhook,
};
