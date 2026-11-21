/**
 * First-time local env setup.
 *
 *   pnpm run setup:dev
 *   # edit .env.local (optional integrations)
 *   pnpm run env
 *   pnpm run dev
 */

import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCliLogger } from "@bondery/helpers/cli";
import { EXAMPLE_POSTGRES_PASSWORD } from "../../packages/helpers/src/env/index.ts";
import { upsertEnvAssignments } from "../env/env-upsert.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const log = createCliLogger("setup:dev");

/** Inventable first-party OAuth values — empty in `.env.local.example`, required for `pnpm run env`. */
const INVENTABLE_AUTH = [
  { bytes: 16, key: "BONDERY_PUBLIC_OAUTH_CLIENT_ID" },
  { bytes: 16, key: "BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID" },
  { bytes: 32, key: "BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET" },
] as const;

function generatePostgresPassword(): string {
  return randomBytes(24).toString("base64").replace(/[/+=]/g, "").slice(0, 32);
}

function isPostgresPasswordPlaceholder(value: string | undefined): boolean {
  if (!value) {
    return true;
  }
  return value === EXAMPLE_POSTGRES_PASSWORD || value === "password";
}

function run(cmd: string) {
  execSync(cmd, { cwd: repoRoot, stdio: "inherit" });
}

function readEnvAssignment(content: string, key: string): string | undefined {
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!match) {
    return undefined;
  }
  let raw = match[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  return raw;
}

/** Fill empty inventable OAuth client id/secret placeholders so env check can pass. */
function seedInventableAuthSecrets(envPath: string) {
  const content = readFileSync(envPath, "utf-8");
  const updates: Record<string, string> = {};

  for (const { key, bytes } of INVENTABLE_AUTH) {
    const current = readEnvAssignment(content, key);
    if (current) {
      continue;
    }
    updates[key] = randomBytes(bytes).toString("hex");
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  upsertEnvAssignments(envPath, updates);
  log.warn(`Generated ${Object.keys(updates).length} local OAuth client value(s) in .env.local`);
  for (const key of Object.keys(updates)) {
    log.info(`  ${key}`);
  }
}

/** Seed bundled local Postgres password when still on the example placeholder. */
function seedPostgresPassword(envPath: string) {
  const content = readFileSync(envPath, "utf-8");
  const current = readEnvAssignment(content, "BONDERY_PRIVATE_POSTGRES_PASSWORD");
  if (!isPostgresPasswordPlaceholder(current)) {
    return;
  }

  const password = generatePostgresPassword();
  upsertEnvAssignments(envPath, { BONDERY_PRIVATE_POSTGRES_PASSWORD: password });
  log.warn("Generated BONDERY_PRIVATE_POSTGRES_PASSWORD in .env.local");
  log.info("  pnpm run env will derive DATABASE_URL for api/db");
}

/** Local Redis is TLS-only with a password (pnpm run start:redis). Old files still have redis://. */
const LEGACY_LOCAL_REDIS_URL = "redis://127.0.0.1:26636";

function seedRedisTls(envPath: string) {
  const content = readFileSync(envPath, "utf-8");
  const url = readEnvAssignment(content, "BONDERY_PRIVATE_REDIS_URL");
  if (url && url !== LEGACY_LOCAL_REDIS_URL) {
    return; // a remote or custom Redis: leave it alone
  }

  const updates: Record<string, string> = {
    BONDERY_PRIVATE_REDIS_URL: "rediss://127.0.0.1:26636",
  };
  if (!readEnvAssignment(content, "BONDERY_PRIVATE_REDIS_PASSWORD_FILE")) {
    updates.BONDERY_PRIVATE_REDIS_PASSWORD_FILE = "../../.temp/redis-secrets/client/password";
  }
  if (!readEnvAssignment(content, "BONDERY_PRIVATE_REDIS_TLS_CA_FILE")) {
    updates.BONDERY_PRIVATE_REDIS_TLS_CA_FILE = "../../.temp/redis-secrets/client/ca.crt";
  }

  upsertEnvAssignments(envPath, updates);
  log.warn("Set up local Redis TLS + password in .env.local (pnpm run start:redis creates them)");
}

/**
 * Local Postgres is TLS-only (pnpm run start:postgres). Point the dev tools at its CA, unless the
 * developer already chose a TLS mode (for example an external database).
 */
function seedPostgresTls(envPath: string) {
  const content = readFileSync(envPath, "utf-8");
  if (readEnvAssignment(content, "DATABASE_SSL_MODE")) {
    return;
  }
  upsertEnvAssignments(envPath, {
    DATABASE_SSL_MODE: "verify-full",
    DATABASE_SSL_ROOT_CERT_FILE: "../../.temp/postgres-secrets/client/ca.crt",
  });
  log.warn(
    "Set up local Postgres TLS in .env.local. Recreate the dev database once: pnpm run start:postgres",
  );
}

/**
 * Local SeaweedFS serves the API over HTTPS with a private CA (pnpm run start:seaweedfs). Older
 * files still point at the plaintext gateway. A remote or custom endpoint is left alone.
 */
const LOCAL_S3_ENDPOINT = "https://127.0.0.1:8443";
const LEGACY_LOCAL_S3_ENDPOINTS = new Set(["http://127.0.0.1:8333", "http://localhost:8333"]);

function seedStorageTls(envPath: string) {
  const content = readFileSync(envPath, "utf-8");
  const endpoint = readEnvAssignment(content, "BONDERY_PRIVATE_S3_ENDPOINT");
  if (endpoint && endpoint !== LOCAL_S3_ENDPOINT && !LEGACY_LOCAL_S3_ENDPOINTS.has(endpoint)) {
    return;
  }
  const updates: Record<string, string> = {};
  if (endpoint !== LOCAL_S3_ENDPOINT) {
    updates.BONDERY_PRIVATE_S3_ENDPOINT = LOCAL_S3_ENDPOINT;
  }
  if (!readEnvAssignment(content, "BONDERY_PRIVATE_S3_TLS_CA_FILE")) {
    updates.BONDERY_PRIVATE_S3_TLS_CA_FILE = "../../.temp/storage-secrets/client/ca.crt";
  }
  if (Object.keys(updates).length === 0) {
    return;
  }
  upsertEnvAssignments(envPath, updates);
  log.warn(
    "Set up local object storage TLS in .env.local. Restart SeaweedFS once: pnpm run stop:seaweedfs && pnpm run start:seaweedfs",
  );
}

/**
 * The API serves HTTPS only (port 26642), like the deployed stack. The webapp's server side calls
 * it directly; browsers go through Portless. Older files point at the plaintext port 26631, which
 * no longer exists. A remote or custom internal URL is left alone.
 */
const LOCAL_INTERNAL_API_URL = "https://127.0.0.1:26642";
const LEGACY_LOCAL_INTERNAL_API_URL = "http://127.0.0.1:26631";
const LOCAL_PUBLIC_API_URL = "https://api.usebondery.test";
/** The old plaintext API port, on loopback, a LAN IP, or a Tailscale IP or name (phone testing). */
const LEGACY_PUBLIC_API_URL = /^http:\/\/[^/]+:26631\/?$/;

/** Moves a plaintext public API URL to Portless. Phones now use `pnpm run dev:mobile-api`. */
function migrateLegacyPublicApiUrl(envPath: string) {
  const publicUrl = readEnvAssignment(readFileSync(envPath, "utf-8"), "BONDERY_PUBLIC_API_URL");
  if (!(publicUrl && LEGACY_PUBLIC_API_URL.test(publicUrl))) {
    return;
  }
  upsertEnvAssignments(envPath, { BONDERY_PUBLIC_API_URL: LOCAL_PUBLIC_API_URL });
  log.warn(
    `The API serves HTTPS only now. BONDERY_PUBLIC_API_URL moved from ${publicUrl} to ${LOCAL_PUBLIC_API_URL}. For a phone, run pnpm run dev:mobile-api`,
  );
}
const API_TLS_FILES = {
  BONDERY_INFRA_INTERNAL_API_CA_FILE: "../../.temp/api-secrets/client/ca.crt",
  BONDERY_PRIVATE_API_TLS_CERT_FILE: "../../.temp/api-secrets/server/tls.crt",
  BONDERY_PRIVATE_API_TLS_KEY_FILE: "../../.temp/api-secrets/server/tls.key",
};

function seedApiTls(envPath: string) {
  const content = readFileSync(envPath, "utf-8");
  const internalUrl = readEnvAssignment(content, "BONDERY_INFRA_INTERNAL_API_URL");
  if (
    internalUrl &&
    internalUrl !== LOCAL_INTERNAL_API_URL &&
    internalUrl !== LEGACY_LOCAL_INTERNAL_API_URL
  ) {
    return;
  }
  const updates: Record<string, string> = {};
  if (internalUrl !== LOCAL_INTERNAL_API_URL) {
    updates.BONDERY_INFRA_INTERNAL_API_URL = LOCAL_INTERNAL_API_URL;
  }
  for (const [key, value] of Object.entries(API_TLS_FILES)) {
    if (!readEnvAssignment(content, key)) {
      updates[key] = value;
    }
  }
  if (Object.keys(updates).length > 0) {
    upsertEnvAssignments(envPath, updates);
    log.warn("Set up the API's HTTPS listener in .env.local. Restart pnpm run dev");
  }
  // The dev API and webapp read these files at boot, so create them now.
  run("pnpm run api:secrets");
}

function main() {
  const rootEnv = join(repoRoot, ".env.local");
  const example = join(repoRoot, ".env.local.example");

  // Apps import `@bondery/*/dist` — stale packages make `scripts/env/env.ts` crash (e.g. SYNC_TARGETS).
  log.step(1, 3, "Compile workspace packages");
  run("pnpm run build:packages");

  log.step(2, 3, "Ensure .env.local exists");
  if (!existsSync(example)) {
    log.info("Generating examples from manifest…");
    run("node --import tsx scripts/env/env.ts --write-examples");
  }
  if (!existsSync(rootEnv)) {
    copyFileSync(example, rootEnv);
    log.warn("Created .env.local from example — edit optional integrations as needed");
  } else {
    log.info(".env.local already present");
  }
  seedInventableAuthSecrets(rootEnv);
  seedPostgresPassword(rootEnv);
  seedRedisTls(rootEnv);
  seedPostgresTls(rootEnv);
  seedStorageTls(rootEnv);
  seedApiTls(rootEnv);
  migrateLegacyPublicApiUrl(rootEnv);

  log.step(3, 3, "Sync app env files (development + production) → check");
  run("pnpm run env");

  log.success("Dev env ready");
  log.info("Next: pnpm run start:postgres && pnpm run start:redis && pnpm run start:seaweedfs");
  log.info(
    "Then: pnpm run env && pnpm run dev (set BONDERY_DEV_SKIP_RELEASE_MIGRATE=true if you already migrated locally)",
  );
}

main();
