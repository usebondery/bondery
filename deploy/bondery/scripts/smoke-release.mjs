#!/usr/bin/env node
/**
 * Release smoke for deploy/bondery — pins a GHCR image tag and asserts health.
 *
 * Usage (from repo root):
 *   node deploy/bondery/scripts/smoke-release.mjs --service webapp --tag 1.7.5
 *   node deploy/bondery/scripts/smoke-release.mjs --service api --tag 1.7.5
 *   node deploy/bondery/scripts/smoke-release.mjs --service api --tag s3-local --skip-pull
 *
 * Prerequisites: docker compose v2.38+, dokploy-network, GHCR login when pulling private images.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BONDERY_DIR = resolve(__dirname, "..");

const SMOKE_DOMAINS = {
  BONDERY_INFRA_API_DOMAIN: "api.example-smoke.test",
  BONDERY_INFRA_STORAGE_DOMAIN: "storage.example-smoke.test",
  BONDERY_INFRA_WEBAPP_DOMAIN: "app.example-smoke.test",
  BONDERY_INFRA_WEBSITE_DOMAIN: "www.example-smoke.test",
};

/** Inventable OAuth values left empty in deploy/.env.example — required for api pre_start. */
const SMOKE_INVENTABLE_AUTH = {
  BONDERY_PUBLIC_OAUTH_CLIENT_ID: "fedcba0987654321fedcba0987654321",
};

/** Real SMTP from Infisical staging — overlay in CI; local smoke may use .env.example placeholders. */
const SMOKE_REMOTE_EMAIL_KEYS = [
  "BONDERY_PRIVATE_EMAIL_ADDRESS",
  "BONDERY_PRIVATE_EMAIL_HOST",
  "BONDERY_PRIVATE_EMAIL_PASS",
  "BONDERY_PRIVATE_EMAIL_PORT",
  "BONDERY_PRIVATE_EMAIL_REPLY_TO",
  "BONDERY_PRIVATE_EMAIL_USER",
];

const DEFAULT_IMAGES = {
  api: "ghcr.io/usebondery/api",
  webapp: "ghcr.io/usebondery/webapp",
};

/** Compose interpolates the process environment over `--env-file`. Infisical staging must not win. */
let smokeImageTag = "";

function subprocessEnv() {
  return {
    ...process.env,
    ...SMOKE_DOMAINS,
    ...(smokeImageTag ? { BONDERY_INFRA_VERSION: smokeImageTag } : {}),
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  let service;
  let tag;
  let imageName;
  let skipPull = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--service") {
      service = args[++i];
    } else if (args[i] === "--tag") {
      tag = args[++i];
    } else if (args[i] === "--image") {
      imageName = args[++i];
    } else if (args[i] === "--skip-pull") {
      skipPull = true;
    }
  }

  if (!service || !tag) {
    console.error(
      "Usage: smoke-release.mjs --service webapp|api --tag X.Y.Z [--image ghcr.io/usebondery/...] [--skip-pull]",
    );
    process.exit(1);
  }

  if (service !== "webapp" && service !== "api") {
    console.error(`Unknown service: ${service}`);
    process.exit(1);
  }

  return {
    imageName: imageName ?? DEFAULT_IMAGES[service],
    service,
    skipPull,
    tag,
  };
}

function run(command, options = {}) {
  const result = spawnSync(command, {
    cwd: BONDERY_DIR,
    shell: true,
    stdio: "inherit",
    ...options,
    env: subprocessEnv(),
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function parseEnvValue(raw) {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function formatEnvLine(key, value) {
  if (/[\s#="'\\]/.test(value)) {
    return `${key}="${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return `${key}=${value}`;
}

function readRemoteEmailEnv() {
  return Object.fromEntries(
    SMOKE_REMOTE_EMAIL_KEYS.filter((key) => process.env[key]?.trim()).map((key) => [
      key,
      process.env[key].trim(),
    ]),
  );
}

function assertSmokeEmailEnvInCi() {
  if (process.env.CI !== "true") {
    return;
  }

  const missing = SMOKE_REMOTE_EMAIL_KEYS.filter((key) => !process.env[key]?.trim());
  if (missing.length === 0) {
    return;
  }

  console.error(
    `Release smoke in CI requires Infisical staging email vars: ${missing.join(", ")}\n` +
      "Run ./.github/actions/shared/infisical-staging-secrets before smoke-release.mjs.",
  );
  process.exit(1);
}

function dumpComposeDiagnostics() {
  console.error("docker compose failed — collecting diagnostics");
  spawnSync("docker compose --env-file .env.smoke ps -a", {
    cwd: BONDERY_DIR,
    env: subprocessEnv(),
    shell: true,
    stdio: "inherit",
  });
  spawnSync("docker compose --env-file .env.smoke logs --tail=120", {
    cwd: BONDERY_DIR,
    env: subprocessEnv(),
    shell: true,
    stdio: "inherit",
  });
  console.error("Re-running release-migrate (api pre_start[0]) to capture output…");
  spawnSync(
    "docker compose --env-file .env.smoke run --rm api node apps/api/dist/cli/release-migrate.js",
    {
      cwd: BONDERY_DIR,
      env: subprocessEnv(),
      shell: true,
      stdio: "inherit",
    },
  );
}

function runCompose(command) {
  const result = spawnSync(`docker compose --env-file .env.smoke ${command}`, {
    cwd: BONDERY_DIR,
    env: subprocessEnv(),
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    dumpComposeDiagnostics();
    process.exit(result.status ?? 1);
  }
}

function curlOk(url) {
  const result = spawnSync(`curl -sf "${url}"`, { shell: true, stdio: "pipe" });
  return result.status === 0;
}

function logReadyHealthFailure(url) {
  const result = spawnSync(`curl -s "${url}"`, { encoding: "utf8", shell: true });
  if (result.stdout?.trim()) {
    console.error(`Readiness probe body from ${url}:\n${result.stdout}`);
  }
}

function waitFor(predicate, { attempts = 40, intervalSec = 3, label = "service" }) {
  for (let i = 1; i <= attempts; i++) {
    if (predicate()) {
      console.log(`${label} healthy`);
      return;
    }
    if (i === attempts) {
      console.error(`${label} did not become healthy after ${attempts} attempts`);
      if (label === "api") {
        logReadyHealthFailure("http://127.0.0.1:26631/health/ready");
      }
      if (label === "webapp") {
        logReadyHealthFailure("http://127.0.0.1:26632/health/ready");
      }
      run("docker compose --env-file .env.smoke ps");
      run("docker compose --env-file .env.smoke logs --tail=80");
      process.exit(1);
    }
    spawnSync(`sleep ${intervalSec}`, { shell: true });
  }
}

function prepareEnvSmoke() {
  assertSmokeEmailEnvInCi();
  const remoteEmail = readRemoteEmailEnv();

  copyFileSync(resolve(BONDERY_DIR, ".env.example"), resolve(BONDERY_DIR, ".env.smoke"));

  const lines = readFileSync(resolve(BONDERY_DIR, ".env.smoke"), "utf8").split("\n");
  const seen = new Set();
  const out = lines.map((line) => {
    if (!line || line.trimStart().startsWith("#") || !line.includes("=")) {
      return line;
    }
    const key = line.split("=")[0]?.trim();
    const rawValue = line.slice(line.indexOf("=") + 1);
    if (key && key in SMOKE_DOMAINS) {
      seen.add(key);
      return `${key}=${SMOKE_DOMAINS[key]}`;
    }
    if (key && key in remoteEmail) {
      seen.add(key);
      return formatEnvLine(key, remoteEmail[key]);
    }
    if (key && key in SMOKE_INVENTABLE_AUTH && !parseEnvValue(rawValue)) {
      seen.add(key);
      return `${key}=${SMOKE_INVENTABLE_AUTH[key]}`;
    }
    return line;
  });

  for (const [key, value] of Object.entries(SMOKE_DOMAINS)) {
    if (!seen.has(key)) {
      out.push(`${key}=${value}`);
    }
  }

  for (const [key, value] of Object.entries(SMOKE_INVENTABLE_AUTH)) {
    if (!seen.has(key)) {
      out.push(`${key}=${value}`);
    }
  }

  for (const key of SMOKE_REMOTE_EMAIL_KEYS) {
    if (key in remoteEmail && !seen.has(key)) {
      out.push(formatEnvLine(key, remoteEmail[key]));
    }
  }

  writeFileSync(resolve(BONDERY_DIR, ".env.smoke"), `${out.join("\n")}\n`);
  copyFileSync(resolve(BONDERY_DIR, ".env.smoke"), resolve(BONDERY_DIR, ".env"));
}

/** Pin BONDERY_INFRA_VERSION for paired api/webapp compose images in smoke. */
function applySmokeVersion(tag) {
  smokeImageTag = tag;
  const envPath = resolve(BONDERY_DIR, ".env.smoke");
  const lines = readFileSync(envPath, "utf8").split("\n");
  const key = "BONDERY_INFRA_VERSION";
  let found = false;
  const out = lines.map((line) => {
    if (!line || line.trimStart().startsWith("#") || !line.includes("=")) {
      return line;
    }
    const lineKey = line.split("=")[0]?.trim();
    if (lineKey === key) {
      found = true;
      return `${key}=${tag}`;
    }
    return line;
  });

  if (!found) {
    out.push(`${key}=${tag}`);
  }

  writeFileSync(envPath, `${out.join("\n")}\n`);
  copyFileSync(envPath, resolve(BONDERY_DIR, ".env"));
}

function writeOverride(service, imageName, tag, skipPull) {
  const image = `${imageName}:${tag}`;
  const pullPolicy = skipPull ? "    pull_policy: never\n" : "";
  let override = "services:\n";

  if (service === "webapp") {
    override += `  webapp:\n    image: ${image}\n${pullPolicy}    ports:\n      - "26632:26632"\n`;
    override += `  db:\n    ports:\n      - "54322:5432"\n`;
    override += `  seaweedfs-s3:\n    ports:\n      - "8333:8333"\n`;
  } else {
    override += `  api:\n    image: ${image}\n${pullPolicy}    ports:\n      - "26631:26631"\n`;
    override += `  db:\n    ports:\n      - "54322:5432"\n`;
    override += `  seaweedfs-s3:\n    ports:\n      - "8333:8333"\n`;
  }

  if (skipPull) {
    // Local-only tags cannot be pulled. redis-secrets runs the api image, and so does api when
    // the webapp is the service under test.
    override += "  redis-secrets:\n    pull_policy: never\n";
    if (service === "webapp") {
      override += "  api:\n    pull_policy: never\n";
    }
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
    console.error("S3 ListBuckets probe failed");
    process.exit(1);
  }

  const speaksS3 =
    (/HTTP\/[\d.]+ 200/.test(out) && out.includes("ListAllMyBucketsResult")) ||
    (/HTTP\/[\d.]+ 403/.test(out) && out.includes("<Error"));
  if (!speaksS3) {
    console.error(
      "S3 gateway did not speak S3 XML (expected 200 ListAllMyBucketsResult or 403 Error):\n",
      out,
    );
    process.exit(1);
  }

  console.log("S3 gateway ListBuckets returned protocol XML");
}

function smokeWebapp(skipPull) {
  if (!skipPull) {
    runCompose("pull api webapp");
  }
  runCompose("up -d webapp");

  waitFor(
    () =>
      curlOk("http://127.0.0.1:26632/health/live") && curlOk("http://127.0.0.1:26632/health/ready"),
    { attempts: 30, intervalSec: 2, label: "webapp" },
  );

  const body = spawnSync(
    'curl -sf -H "Accept-Encoding: identity" http://127.0.0.1:26632/runtime-config.json',
    {
      encoding: "utf8",
      shell: true,
    },
  );
  if (body.status !== 0) {
    console.error("runtime-config.json request failed");
    process.exit(1);
  }
  if (!body.stdout.includes("api.example-smoke.test")) {
    console.error("runtime-config.json missing public API host");
    console.error(body.stdout);
    process.exit(1);
  }
  if (body.stdout.includes("api:26631")) {
    console.error("INTERNAL URL LEAKED into runtime-config.json");
    process.exit(1);
  }
}

function smokeApi(skipPull) {
  if (!skipPull) {
    runCompose("pull api");
  }
  runCompose("up -d api");

  waitFor(
    () =>
      curlOk("http://127.0.0.1:26631/health/live") && curlOk("http://127.0.0.1:26631/health/ready"),
    { attempts: 45, intervalSec: 3, label: "api" },
  );

  assertS3GatewaySpeaksS3();
}

function tearDown() {
  run("docker compose --env-file .env.smoke down -v || true");
}

const { service, tag, imageName, skipPull } = parseArgs();

try {
  prepareEnvSmoke();
  applySmokeVersion(tag);
  writeOverride(service, imageName, tag, skipPull);

  run("node scripts/check-compose.mjs");

  if (service === "webapp") {
    smokeWebapp(skipPull);
  } else {
    smokeApi(skipPull);
  }

  console.log(`Release smoke passed for ${service}:${tag}`);
} finally {
  tearDown();
}
