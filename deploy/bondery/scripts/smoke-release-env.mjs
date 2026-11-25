/**
 * Environment of the release smoke (smoke-release.mjs): the failure type, the smoke's domains, and
 * the `.env.smoke` / `.env` files that compose reads. Split from the runner to keep both small.
 */
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BONDERY_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const ENV_QUOTE_NEEDED_RE = /[\s#="'\\]/;

/**
 * A failed assertion or command. It carries the message and the output to print, and whether a
 * docker compose command is what failed, so the report says only what happened.
 */
class SmokeFailure extends Error {
  /**
   * @param {string} message
   * @param {{ output?: string; compose?: boolean }} [details]
   */
  constructor(message, { output = "", compose = false } = {}) {
    super(message);
    this.name = "SmokeFailure";
    this.output = output;
    this.compose = compose;
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
  if (ENV_QUOTE_NEEDED_RE.test(value)) {
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

  throw new SmokeFailure(
    `Release smoke in CI requires Infisical staging email vars: ${missing.join(", ")}`,
    {
      output: "Run ./.github/actions/shared/infisical-staging-secrets before smoke-release.mjs.",
    },
  );
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

/** Pins BONDERY_INFRA_VERSION for the paired api/webapp compose images. Returns the tag. */
function applySmokeVersion(versionTag) {
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
      return `${key}=${versionTag}`;
    }
    return line;
  });

  if (!found) {
    out.push(`${key}=${versionTag}`);
  }

  writeFileSync(envPath, `${out.join("\n")}\n`);
  copyFileSync(envPath, resolve(BONDERY_DIR, ".env"));
  return versionTag;
}

export { applySmokeVersion, prepareEnvSmoke, SMOKE_DOMAINS, SmokeFailure };
