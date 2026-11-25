#!/usr/bin/env node
/**
 * Release smoke for deploy/bondery. It smokes the RELEASE, not one component: one run brings api
 * and webapp up at the same version, behind a real Traefik, and asserts both.
 *
 * Usage (from repo root):
 *   node deploy/bondery/scripts/smoke-release.mjs --tag 1.7.5
 *   node deploy/bondery/scripts/smoke-release.mjs --tag s3-local --skip-pull
 *
 * Prerequisites: docker compose v2.38+, dokploy-network, GHCR login when pulling private images.
 *
 * The smoke models production, because production is what a failure here protects:
 * - the Traefik dynamic folder is owned by root, as Dokploy's is, so the traefik-transport job
 *   (root, no capabilities) writes it the way it does in production;
 * - a Traefik container, the version Dokploy runs, reads that folder at Dokploy's mount path and
 *   forwards requests for the public domains;
 * - host files are read and removed through a root container, never as the runner user.
 *
 * It fails fast and tells the truth: the first failed assertion stops the run, names itself, and
 * sets the exit code. "docker compose failed" appears only when a compose command failed, and
 * "Release smoke passed" only when the exit code is 0.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applySmokeVersion,
  prepareEnvSmoke,
  SMOKE_DOMAINS,
  SmokeFailure,
} from "./smoke-release-env.mjs";
import {
  assertApiHttpsOnly,
  assertApiInternalTls,
  assertPostgresTls,
  assertRedisMutualTls,
  assertStorageTls,
} from "./smoke-release-tls.mjs";
import { assertTraefikRouting, ROOT_HELPER_IMAGE, stopTraefik } from "./smoke-release-traefik.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BONDERY_DIR = resolve(__dirname, "..");
const DYNAMIC_DIR_NAME = ".smoke-traefik-dynamic";
/** Stands in for Traefik's dynamic folder (see docker-compose.yml traefik-transport). */
const TRAEFIK_DYNAMIC_DIR = resolve(BONDERY_DIR, DYNAMIC_DIR_NAME);
/** The API CA, exported from the api container, so the host can verify the API's HTTPS port. */
const API_CA_FILE = resolve(BONDERY_DIR, ".smoke-api-ca.crt");
/** The API serves HTTPS only (docs/adr/0031-internal-api-tls.mdx). */
const API_HEALTH_BASE = "https://127.0.0.1:26631/health";

const DEFAULT_IMAGES = {
  api: "ghcr.io/usebondery/api",
  webapp: "ghcr.io/usebondery/webapp",
};

const HTTP_200_RE = /HTTP\/[\d.]+ 200/;
const HTTP_403_RE = /HTTP\/[\d.]+ 403/;
const USAGE =
  "Usage: smoke-release.mjs --tag X.Y.Z [--api-image ghcr.io/usebondery/api] [--webapp-image ghcr.io/usebondery/webapp] [--skip-pull]";

/** Compose interpolates the process environment over `--env-file`. Infisical staging must not win. */
let smokeImageTag = "";
/** True once a compose command has started containers, so diagnostics have something to read. */
let stackStarted = false;

function subprocessEnv() {
  return {
    ...process.env,
    ...SMOKE_DOMAINS,
    ...(smokeImageTag ? { BONDERY_INFRA_VERSION: smokeImageTag } : {}),
  };
}

/**
 * @returns {{ apiImage: string; webappImage: string; skipPull: boolean; tag: string } | undefined}
 *   undefined when the arguments are invalid (the usage is printed).
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let tag;
  let apiImage = DEFAULT_IMAGES.api;
  let webappImage = DEFAULT_IMAGES.webapp;
  let skipPull = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--tag") {
      tag = args[++i];
    } else if (arg === "--api-image") {
      apiImage = args[++i];
    } else if (arg === "--webapp-image") {
      webappImage = args[++i];
    } else if (arg === "--skip-pull") {
      skipPull = true;
    } else {
      console.error(`Unknown argument: ${arg}\n${USAGE}`);
      return;
    }
  }

  if (!(tag && apiImage && webappImage)) {
    console.error(USAGE);
    return;
  }
  return { apiImage, skipPull, tag, webappImage };
}

/** Runs `docker <args>` and returns the result (utf8). Never throws. */
function docker(args, input) {
  return spawnSync("docker", args, { encoding: "utf8", input });
}

/** Runs a command in the bondery folder with output attached. Throws on a non-zero exit. */
function runChecked(command, label) {
  const result = spawnSync(command, {
    cwd: BONDERY_DIR,
    env: subprocessEnv(),
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new SmokeFailure(`${label} failed (exit ${result.status ?? "none"})`);
  }
}

/** Prints what the stack and its containers say, for a failure that happened with it running. */
function dumpDiagnostics() {
  const inherit = { cwd: BONDERY_DIR, env: subprocessEnv(), shell: true, stdio: "inherit" };
  spawnSync("docker compose --env-file .env.smoke ps -a", inherit);
  spawnSync("docker compose --env-file .env.smoke logs --tail=120", inherit);
  console.error("Re-running release-migrate (api pre_start[0]) to capture output…");
  spawnSync(
    "docker compose --env-file .env.smoke run --rm api node apps/api/dist/cli/release-migrate.js",
    inherit,
  );
}

/** Runs `docker compose <args>` for the smoke stack and returns the result (utf8). */
function composeSync(args, input) {
  return spawnSync(`docker compose --env-file .env.smoke ${args}`, {
    cwd: BONDERY_DIR,
    encoding: "utf8",
    env: subprocessEnv(),
    input,
    shell: true,
  });
}

/** Runs a compose command with output attached. Throws, naming the command, when it fails. */
function runCompose(command) {
  const result = spawnSync(`docker compose --env-file .env.smoke ${command}`, {
    cwd: BONDERY_DIR,
    env: subprocessEnv(),
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new SmokeFailure(`docker compose ${command} failed (exit ${result.status ?? "none"})`, {
      compose: true,
    });
  }
}

/** Reports a failed assertion by throwing: the first failure stops the smoke. */
function failSmoke(message, output) {
  throw new SmokeFailure(message, { output: output ?? "" });
}

/** `curl` arguments that trust the API CA, for https://127.0.0.1:26631 URLs. */
function curlTrust(url) {
  return url.startsWith(API_HEALTH_BASE) ? `--cacert "${API_CA_FILE}" ` : "";
}

function curlOk(url) {
  const result = spawnSync(`curl -sf ${curlTrust(url)}"${url}"`, { shell: true, stdio: "pipe" });
  return result.status === 0;
}

/**
 * Copies the API CA out of the api container (it mounts the CA certificate for its own
 * healthcheck). False until the container runs.
 */
function exportApiCa() {
  const result = composeSync("exec -T api cat /bondery-api/client/ca.crt");
  if (result.status !== 0 || !(result.stdout ?? "").includes("BEGIN CERTIFICATE")) {
    return false;
  }
  writeFileSync(API_CA_FILE, result.stdout);
  return true;
}

function readyProbeBody(url) {
  const result = spawnSync(`curl -s ${curlTrust(url)}"${url}"`, {
    encoding: "utf8",
    shell: true,
  });
  return result.stdout?.trim() ? `Readiness probe body from ${url}:\n${result.stdout}` : "";
}

/** Blocks the smoke for `seconds`. */
function sleep(seconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

function waitFor(predicate, { attempts = 40, intervalSec = 3, label = "service", probeUrl }) {
  for (let i = 1; i <= attempts; i++) {
    if (predicate()) {
      console.log(`${label} healthy`);
      return;
    }
    if (i < attempts) {
      sleep(intervalSec);
    }
  }
  throw new SmokeFailure(`${label} did not become healthy after ${attempts} attempts`, {
    output: probeUrl ? readyProbeBody(probeUrl) : "",
  });
}

/**
 * Creates the fixture dynamic folder owned by root, mode 0755, the way Dokploy's
 * /etc/dokploy/traefik/dynamic is. The runner user cannot create root-owned folders, so a
 * throwaway root container changes the owner. A folder the runner owns would let the job's
 * root-without-capabilities write into it and hide a permission failure that production has.
 */
function createRootOwnedDynamicDir() {
  removeDynamicDir();
  mkdirSync(TRAEFIK_DYNAMIC_DIR, { recursive: true });
  const result = docker([
    "run",
    "--rm",
    "-v",
    `${TRAEFIK_DYNAMIC_DIR}:/d`,
    ROOT_HELPER_IMAGE,
    "sh",
    "-c",
    "chown 0:0 /d && chmod 0755 /d",
  ]);
  if (result.status !== 0) {
    throw new SmokeFailure("Could not make the fixture Traefik folder root-owned", {
      output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    });
  }
}

/** Removes the fixture folder through a root container: the runner cannot delete root's files. */
function removeDynamicDir() {
  const result = docker([
    "run",
    "--rm",
    "-v",
    `${BONDERY_DIR}:/p`,
    ROOT_HELPER_IMAGE,
    "rm",
    "-rf",
    `/p/${DYNAMIC_DIR_NAME}`,
  ]);
  if (result.status !== 0) {
    console.error(
      `Could not remove ${TRAEFIK_DYNAMIC_DIR}: ${result.stderr ?? ""}\nRemove it by hand: it is owned by root.`,
    );
  }
}

/**
 * The override pins both images, publishes the ports the host-side probes use, and points the
 * traefik-transport job at the fixture folder (no Dokploy here).
 */
function writeOverride({ apiImage, webappImage, tag, useLocalImages }) {
  const pullPolicy = useLocalImages ? "    pull_policy: never\n" : "";
  let override = "services:\n";
  override += `  api:\n    image: ${apiImage}:${tag}\n${pullPolicy}    ports:\n      - "127.0.0.1:26631:26631"\n`;
  override += `  webapp:\n    image: ${webappImage}:${tag}\n${pullPolicy}    ports:\n      - "26632:26632"\n`;
  override += `  db:\n    ports:\n      - "127.0.0.1:54322:5432"\n`;
  override += `  seaweedfs-s3:\n    ports:\n      - "8333:8333"\n`;
  override += `  traefik-transport:\n    volumes:\n      - type: bind\n        source: ${TRAEFIK_DYNAMIC_DIR}\n        target: /traefik-dynamic\n`;

  if (useLocalImages) {
    // Local-only tags cannot be pulled. stack-secrets runs the api image too.
    override += "  stack-secrets:\n    pull_policy: never\n";
  }

  writeFileSync(resolve(BONDERY_DIR, "docker-compose.override.yml"), override);
}

function assertS3GatewaySpeaksS3() {
  const result = spawnSync("curl -sS -D- --max-time 5 http://127.0.0.1:8333/", {
    encoding: "utf8",
    shell: true,
  });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0) {
    failSmoke("S3 ListBuckets probe failed", out);
  }

  const speaksS3 =
    (HTTP_200_RE.test(out) && out.includes("ListAllMyBucketsResult")) ||
    (HTTP_403_RE.test(out) && out.includes("<Error"));
  if (!speaksS3) {
    failSmoke(
      "S3 gateway did not speak S3 XML (expected 200 ListAllMyBucketsResult or 403 Error)",
      out,
    );
  }

  console.log("S3 gateway ListBuckets returned protocol XML");
}

function assertWebappRuntimeConfig() {
  const body = spawnSync(
    'curl -sf -H "Accept-Encoding: identity" http://127.0.0.1:26632/runtime-config.json',
    {
      encoding: "utf8",
      shell: true,
    },
  );
  if (body.status !== 0) {
    failSmoke("runtime-config.json request failed", body.stderr);
  }
  if (!body.stdout.includes("api.example-smoke.test")) {
    failSmoke("runtime-config.json missing public API host", body.stdout);
  }
  if (body.stdout.includes("api:26631") || body.stdout.includes(":26631")) {
    failSmoke("INTERNAL URL LEAKED into runtime-config.json", body.stdout);
  }
  console.log("webapp runtime-config.json names the public API host only");
}

/** Brings api and webapp up together and asserts the whole release. */
function smokeRelease({ skipPull }) {
  if (!skipPull) {
    runCompose("pull api webapp");
  }
  stackStarted = true;
  runCompose("up -d api webapp");

  waitFor(
    () => exportApiCa() && curlOk(`${API_HEALTH_BASE}/live`) && curlOk(`${API_HEALTH_BASE}/ready`),
    { attempts: 45, intervalSec: 3, label: "api", probeUrl: `${API_HEALTH_BASE}/ready` },
  );
  waitFor(
    () =>
      curlOk("http://127.0.0.1:26632/health/live") && curlOk("http://127.0.0.1:26632/health/ready"),
    {
      attempts: 30,
      intervalSec: 2,
      label: "webapp",
      probeUrl: "http://127.0.0.1:26632/health/ready",
    },
  );

  const tls = { compose: composeSync, fail: failSmoke };
  assertWebappRuntimeConfig();
  assertApiInternalTls(tls);
  assertS3GatewaySpeaksS3();
  assertApiHttpsOnly(tls);
  assertPostgresTls(tls);
  assertRedisMutualTls(tls);
  assertStorageTls(tls);
  assertTraefikRouting({
    docker,
    domains: {
      api: SMOKE_DOMAINS.BONDERY_INFRA_API_DOMAIN,
      storage: SMOKE_DOMAINS.BONDERY_INFRA_STORAGE_DOMAIN,
    },
    dynamicDir: TRAEFIK_DYNAMIC_DIR,
    fail: failSmoke,
  });
}

/** Removes everything the smoke created. Never throws: it must finish after a failure. */
function tearDown() {
  stopTraefik(docker);
  composeSync("down -v");
  removeDynamicDir();
  rmSync(API_CA_FILE, { force: true });
}

/** Prints a failure, then the stack's diagnostics while the stack is still up. */
function reportFailure(error) {
  const failure =
    error instanceof SmokeFailure
      ? error
      : new SmokeFailure(error instanceof Error ? (error.stack ?? error.message) : String(error));
  console.error(`Failed: ${failure.message}`);
  if (failure.output) {
    console.error(failure.output);
  }
  if (failure.compose) {
    console.error("docker compose failed — collecting diagnostics");
  } else {
    console.error("Collecting diagnostics for the failed assertion");
  }
  if (stackStarted) {
    dumpDiagnostics();
  }
}

/** @returns {number} the process exit code */
function main() {
  const args = parseArgs();
  if (!args) {
    return 1;
  }
  const { apiImage, webappImage, skipPull, tag } = args;
  const subject = `api:${tag} + webapp:${tag}`;
  let failed = false;

  try {
    prepareEnvSmoke();
    smokeImageTag = applySmokeVersion(tag);
    createRootOwnedDynamicDir();
    writeOverride({ apiImage, tag, useLocalImages: skipPull, webappImage });
    runChecked("node scripts/check-compose.mjs", "check-compose.mjs");
    smokeRelease({ skipPull });
  } catch (error) {
    failed = true;
    reportFailure(error);
  } finally {
    tearDown();
  }

  if (failed) {
    console.error(`Release smoke FAILED for ${subject}`);
    return 1;
  }
  console.log(`Release smoke passed for ${subject}`);
  return 0;
}

process.exitCode = main();
