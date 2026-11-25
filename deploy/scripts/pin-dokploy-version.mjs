/**
 * Pins the production product stack to one release in Dokploy, then redeploys it.
 *
 * The release workflow runs this after BOTH images reached :production. It sets
 * `BONDERY_INFRA_VERSION=X.Y.Z` on the Dokploy production Compose app through the Dokploy API, so
 * the redeploy runs api and webapp at exactly that version. The floating `:production` tag is not
 * the deploy source: it moves per component, and a redeploy that follows it can pair a new webapp
 * with an old api.
 *
 * Prerequisites: Infisical production secrets are loaded into process.env (the ops keys
 * `BONDERY_OPS_DOKPLOY_*`), as for sync-infisical-to-dokploy.mjs, whose API client this reuses.
 *
 * Usage:
 *   node deploy/scripts/pin-dokploy-version.mjs --version X.Y.Z [--dry-run]
 */

import { pathToFileURL } from "node:url";
import { DOKPLOY_SYNC_TARGETS, getDokploySyncWebhookBranch } from "@bondery/helpers/env";
import { parseEnvContent } from "@bondery/helpers/env/check-env";
import {
  fetchComposeEnv,
  mergeComposeEnv,
  quoteEnvValue,
  readDokployConfig,
  saveComposeEnv,
  triggerDeployWebhook,
} from "./sync-infisical-to-dokploy.mjs";

const PIN_KEY = "BONDERY_INFRA_VERSION";
const PRODUCTION_TARGET = "services";
/** A production CalVer. A release candidate is never a production pin. */
const PRODUCTION_VERSION_RE = /^\d+\.\d+\.\d+$/;

/**
 * The compose env with the version pinned. Other keys stay as they are.
 *
 * @param {string | null | undefined} existingEnv
 * @param {string} version X.Y.Z
 * @returns {string}
 */
function withVersionPin(existingEnv, version) {
  if (!PRODUCTION_VERSION_RE.test(version)) {
    throw new Error(
      `Refusing to pin "${version}": a production pin is X.Y.Z, never an RC or a tag`,
    );
  }
  return mergeComposeEnv(existingEnv, [{ key: PIN_KEY, value: version }], quoteEnvValue);
}

/**
 * Whether saved compose env pins `version`.
 *
 * @param {string | null | undefined} env
 * @param {string} version
 */
function envPinsVersion(env, version) {
  return parseEnvContent(env ?? "")[PIN_KEY] === version;
}

function parseArgs(argv) {
  let version = "";
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--version") {
      version = argv[++i] ?? "";
    } else if (argv[i] === "--dry-run") {
      dryRun = true;
    }
  }
  return { dryRun, version };
}

/** @param {{ ok: false; problems: string[] }} result */
function fail(result) {
  for (const line of result.problems) {
    console.error(line);
  }
  return 1;
}

/** @returns {Promise<number>} the process exit code */
async function main() {
  const { dryRun, version } = parseArgs(process.argv.slice(2));
  if (!PRODUCTION_VERSION_RE.test(version)) {
    return fail({ ok: false, problems: ["pin-dokploy-version: --version X.Y.Z is required"] });
  }

  const configResult = readDokployConfig(process.env, PRODUCTION_TARGET);
  if (!configResult.ok) {
    return fail(configResult);
  }
  const config = configResult.value;

  const existing = await fetchComposeEnv(config);
  if (!existing.ok) {
    return fail(existing);
  }
  const payload = withVersionPin(existing.value, version);
  console.log(`pin-dokploy-version: pin ${PIN_KEY}=${version} on the production compose app`);
  if (dryRun) {
    console.log("pin-dokploy-version: dry run, skipping the Dokploy API");
    return 0;
  }

  const saved = await saveComposeEnv(config, payload);
  if (!saved.ok) {
    return fail(saved);
  }
  // Read it back: a deploy that runs on an unpinned stack is the failure this script exists for.
  const readBack = await fetchComposeEnv(config);
  if (!readBack.ok) {
    return fail(readBack);
  }
  if (!envPinsVersion(readBack.value, version)) {
    return fail({
      ok: false,
      problems: [`pin-dokploy-version: Dokploy did not keep ${PIN_KEY}=${version}; not deploying`],
    });
  }
  console.log(`pin-dokploy-version: Dokploy now holds ${PIN_KEY}=${version}`);

  if (!config.deployWebhook) {
    console.log(
      `pin-dokploy-version: ${config.webhookKey} is not set; the pin is saved, redeploy in Dokploy`,
    );
    return 0;
  }
  const triggered = await triggerDeployWebhook(
    config.deployWebhook,
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub Actions runner env, not a turbo task input
    process.env.GITHUB_REPOSITORY ?? "usebondery/bondery",
    DOKPLOY_SYNC_TARGETS[PRODUCTION_TARGET].webhookPathSentinels,
    getDokploySyncWebhookBranch(PRODUCTION_TARGET),
  );
  if (!triggered.ok) {
    return fail(triggered);
  }
  console.log("pin-dokploy-version: triggered the production deploy");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}

export { envPinsVersion, withVersionPin };
