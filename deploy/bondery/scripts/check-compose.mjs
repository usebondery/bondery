#!/usr/bin/env node
/**
 * Mechanical checks for deploy/bondery compose:
 * - webapp must never receive PRIVATE_* / BONDERY_PRIVATE_* secrets (except allowed PostHog)
 * - api and webapp must carry Traefik Host() rules and derive public URLs from domains
 * - every public service must redirect HTTP to HTTPS (web-entrypoint router + redirectScheme)
 * - redis must not carry Traefik labels or join dokploy-network
 * - redis must require TLS and a password in every stack variant; api must connect with both
 * - db must require TLS (wrapper, hba file that rejects plaintext); api must verify it against
 *   the stack CA; each Postgres TLS volume is mounted only by the service that needs it
 * - SeaweedFS nodes must use mutual TLS (security.toml) and the api must reach the S3 gateway
 *   over HTTPS with the storage CA (check-compose-storage-tls.mjs)
 * - the webapp must call the api's internal HTTPS listener with the API CA
 *   (check-compose-api-tls.mjs)
 * - db (Postgres) must not carry Traefik labels or join dokploy-network
 * - api must wait for db healthy (not legacy kong)
 * - shared dokploy-network lookups use BONDERY_INFRA_TRAEFIK_PREFIX aliases, not service names
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkApiTls } from "./check-compose-api-tls.mjs";
import { checkPostgresTls } from "./check-compose-postgres-tls.mjs";
import { checkRedisTls } from "./check-compose-redis-tls.mjs";
import { checkStorageTls } from "./check-compose-storage-tls.mjs";

const COMPOSE_VERSION_RE = /v?(\d+)\.(\d+)\.(\d+)/;
const INCLUDE_KEY_RE = /^\s*include:\s*$/m;
const S3_STATUS_PROBE_RE = /8333\/status/;
const S3_ACCESS_KEY_ID_RE = /BONDERY_PRIVATE_S3_ACCESS_KEY_ID/;
const HARDCODED_STORAGE_ROUTER_RE = /traefik\.http\.routers\.bondery-storage/;
const SERVICE_BLOCK_NEXT_RE = /^ {2}[a-zA-Z0-9_-]+:\s*$/m;
const ENV_FILE_RE = /^\s*env_file:/m;
const TRAEFIK_ENABLE_RE = /traefik\.enable=true/;
const HARDCODED_WEBAPP_ROUTER_RE = /traefik\.http\.routers\.bondery-webapp/;
const INTERNAL_API_URL_PREFIX_RE =
  /BONDERY_INFRA_INTERNAL_API_URL:\s*https:\/\/\$\{BONDERY_INFRA_TRAEFIK_PREFIX/;
const WEBAPP_NETWORK_ALIAS_RE = /BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-webapp/;
const PUBLIC_API_URL_RE = /BONDERY_PUBLIC_API_URL:\s*https:\/\/\$\{BONDERY_INFRA_API_DOMAIN/;
const HARDCODED_API_ROUTER_RE = /traefik\.http\.routers\.bondery-api/;
const DOKPLOY_NETWORK_RE = /dokploy-network/;
const INTERNAL_NETWORK_RE = /internal/;
const API_NETWORK_ALIAS_RE = /BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-api/;
const S3_ENDPOINT_PREFIX_RE =
  /BONDERY_PRIVATE_S3_ENDPOINT:\s*https:\/\/\$\{BONDERY_INFRA_TRAEFIK_PREFIX/;
const DATABASE_URL_PREFIX_RE = /DATABASE_URL:.*\$\{BONDERY_INFRA_TRAEFIK_PREFIX/;
const DB_HEALTHY_RE = /db:\s*\n\s*condition:\s*service_healthy/;
const KONG_HEALTHY_RE = /kong:\s*\n\s*condition:\s*service_healthy/;
const PRE_START_RE = /pre_start:/m;
const TRAEFIK_LABEL_RE = /traefik\./;
const REDIS_NETWORK_ALIAS_RE = /BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-redis/;
const HEALTHCHECK_RE = /healthcheck:/m;
const DB_NETWORK_ALIAS_RE = /BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-db/;
const POSTGRES_HOST_PORT_RE = /127\.0\.0\.1:\$\{BONDERY_INFRA_POSTGRES_HOST_PORT:-5432\}:5432/;
const PUBLIC_POSTGRES_BIND_RE = /ports:[\s\S]*["']0\.0\.0\.0:/;
const WILDCARD_POSTGRES_BIND_RE = /ports:[\s\S]*["']\*:/;
const STORAGE_NETWORK_ALIAS_RE = /BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-storage/;

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const mainPath = resolve(root, "docker-compose.yml");
  const postgresPath = resolve(root, "docker-compose.postgres.yml");
  const mainText = readFileSync(mainPath, "utf8");
  const postgresText = readFileSync(postgresPath, "utf8");
  const text = `${mainText}\n${postgresText}`;

  const errors = [];

  const MIN_COMPOSE_VERSION = [2, 38, 0];

  function parseComposeVersion(output) {
    const match = output.match(COMPOSE_VERSION_RE);
    if (!match) {
      return null;
    }
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  }

  function isComposeVersionAtLeast(version, minimum) {
    for (let index = 0; index < minimum.length; index++) {
      const current = version[index] ?? 0;
      const min = minimum[index] ?? 0;
      if (current > min) {
        return true;
      }
      if (current < min) {
        return false;
      }
    }
    return true;
  }

  try {
    const composeVersionOutput = execFileSync("docker", ["compose", "version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const composeVersion = parseComposeVersion(composeVersionOutput);
    if (!composeVersion) {
      errors.push("Could not parse docker compose version output");
    } else if (!isComposeVersionAtLeast(composeVersion, MIN_COMPOSE_VERSION)) {
      errors.push(
        `docker compose v${composeVersion.join(".")} is too old — need v${MIN_COMPOSE_VERSION.join(".")}+ for api pre_start`,
      );
    }
  } catch {
    errors.push(
      `docker compose v${MIN_COMPOSE_VERSION.join(".")}+ required for api pre_start — install or upgrade Docker Compose`,
    );
  }

  if (!INCLUDE_KEY_RE.test(mainText) || !mainText.includes("docker-compose.postgres.yml")) {
    errors.push("docker-compose.yml must include path: docker-compose.postgres.yml");
  }

  if (!mainText.includes("docker-compose.seaweedfs.yml")) {
    errors.push("docker-compose.yml must include path: docker-compose.seaweedfs.yml");
  }

  const seaweedPath = resolve(root, "docker-compose.seaweedfs.yml");
  const seaweedText = readFileSync(seaweedPath, "utf8");

  if (seaweedText.includes("s3.json:")) {
    errors.push(
      "seaweedfs-s3 must not mount static s3.json — credentials come from env via entrypoint.sh",
    );
  }

  if (!seaweedText.includes("entrypoint.sh")) {
    errors.push("seaweedfs-s3 must mount seaweedfs/entrypoint.sh");
  }

  if (!seaweedText.includes("s3-ready.sh")) {
    errors.push("seaweedfs-s3 must mount and healthcheck seaweedfs/s3-ready.sh");
  }

  if (S3_STATUS_PROBE_RE.test(seaweedText)) {
    errors.push("seaweedfs-s3 healthcheck must not probe GET /status (empty 200 is not S3-ready)");
  }

  if (!S3_ACCESS_KEY_ID_RE.test(seaweedText)) {
    errors.push("seaweedfs-s3 must pass BONDERY_PRIVATE_S3_ACCESS_KEY_ID from compose env");
  }

  if (!seaweedText.includes("BONDERY_INFRA_TRAEFIK_PREFIX")) {
    errors.push("seaweedfs-s3 Traefik router names must interpolate BONDERY_INFRA_TRAEFIK_PREFIX");
  }
  if (HARDCODED_STORAGE_ROUTER_RE.test(seaweedText)) {
    errors.push("seaweedfs-s3 Traefik router names must not be hardcoded as bondery-storage");
  }

  if (mainText.includes("docker-compose.supabase.yml")) {
    errors.push("docker-compose.yml must not include docker-compose.supabase.yml");
  }

  /** Slice a top-level service block by name (YAML indentation-aware). */
  function serviceBlock(name, source = text) {
    const start = source.search(new RegExp(`^  ${name}:\\s*$`, "m"));
    if (start === -1) {
      errors.push(`Missing service "${name}"`);
      return "";
    }
    const rest = source.slice(start + 1);
    const next = rest.search(SERVICE_BLOCK_NEXT_RE);
    return next === -1 ? source.slice(start) : source.slice(start, start + 1 + next);
  }

  /** Assert a public service redirects plain HTTP to HTTPS via a web-entrypoint router. */
  function checkHttpRedirect(block, name) {
    if (!new RegExp(`-${name}-http\\.entrypoints=web`).test(block)) {
      errors.push(
        `${name} must route HTTP to HTTPS (traefik -${name}-http router on entrypoints=web)`,
      );
    }
    if (!new RegExp(`-${name}-https\\.redirectscheme\\.scheme=https`).test(block)) {
      errors.push(`${name} must define a redirectScheme middleware to https`);
    }
    if (!new RegExp(`-${name}-https\\.redirectscheme\\.permanent=true`).test(block)) {
      errors.push(`${name} redirectScheme middleware must be permanent`);
    }
  }

  const webapp = serviceBlock("webapp", mainText);
  const api = serviceBlock("api", mainText);
  const redis = serviceBlock("redis", mainText);
  const db = serviceBlock("db", postgresText);
  const s3 = serviceBlock("seaweedfs-s3", seaweedText);

  const WEBAPP_ALLOWED_PRIVATE = new Set([
    "BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET",
    "BONDERY_PRIVATE_WEBAPP_SESSION_SECRET",
  ]);

  if (webapp) {
    if (ENV_FILE_RE.test(webapp)) {
      errors.push(
        "webapp must not use env_file (would load API PRIVATE_* / BONDERY_PRIVATE_* secrets)",
      );
    }
    const privateHits = [...webapp.matchAll(/\b(?:BONDERY_)?PRIVATE_[A-Z0-9_]+\b/g)]
      .map((m) => m[0])
      .filter((name) => !WEBAPP_ALLOWED_PRIVATE.has(name));
    if (privateHits.length > 0) {
      errors.push(
        `webapp must not reference PRIVATE_* / BONDERY_PRIVATE_* vars: ${[...new Set(privateHits)].join(", ")}`,
      );
    }
    if (webapp.includes("SUPABASE")) {
      errors.push("webapp must not reference Supabase env vars");
    }
    if (!webapp.includes("BONDERY_INFRA_WEBAPP_DOMAIN")) {
      errors.push("webapp must define a Traefik Host() rule using BONDERY_INFRA_WEBAPP_DOMAIN");
    }
    if (!TRAEFIK_ENABLE_RE.test(webapp)) {
      errors.push("webapp must enable Traefik (traefik.enable=true)");
    }
    if (!webapp.includes("BONDERY_INFRA_TRAEFIK_PREFIX")) {
      errors.push("webapp Traefik router names must interpolate BONDERY_INFRA_TRAEFIK_PREFIX");
    }
    if (HARDCODED_WEBAPP_ROUTER_RE.test(webapp)) {
      errors.push("webapp Traefik router names must not be hardcoded as bondery-webapp");
    }
    if (!webapp.includes("BONDERY_INFRA_INTERNAL_API_URL")) {
      errors.push("webapp must set BONDERY_INFRA_INTERNAL_API_URL for server-side API calls");
    }
    if (webapp.includes("http://api:26631")) {
      errors.push(
        "webapp must not use http://api:26631 — that DNS name collides on shared dokploy-network",
      );
    }
    if (!INTERNAL_API_URL_PREFIX_RE.test(webapp)) {
      errors.push(
        "webapp must derive BONDERY_INFRA_INTERNAL_API_URL from BONDERY_INFRA_TRAEFIK_PREFIX",
      );
    }
    if (!WEBAPP_NETWORK_ALIAS_RE.test(webapp)) {
      errors.push(
        "webapp must publish a unique dokploy-network alias from BONDERY_INFRA_TRAEFIK_PREFIX",
      );
    }
    if (!PUBLIC_API_URL_RE.test(webapp)) {
      errors.push(
        "webapp must derive BONDERY_PUBLIC_API_URL from https:// + BONDERY_INFRA_API_DOMAIN",
      );
    }
    checkHttpRedirect(webapp, "webapp");
  }

  if (api) {
    if (!api.includes("BONDERY_INFRA_API_DOMAIN")) {
      errors.push("api must define a Traefik Host() rule using BONDERY_INFRA_API_DOMAIN");
    }
    if (!PUBLIC_API_URL_RE.test(api)) {
      errors.push(
        "api must derive BONDERY_PUBLIC_API_URL from https:// + BONDERY_INFRA_API_DOMAIN",
      );
    }
    if (api.includes("SUPABASE")) {
      errors.push("api must not reference Supabase env vars");
    }
    if (!api.includes("DATABASE_URL:")) {
      errors.push("api must set DATABASE_URL for Prisma");
    }
    if (!TRAEFIK_ENABLE_RE.test(api)) {
      errors.push("api must enable Traefik (traefik.enable=true)");
    }
    if (!api.includes("BONDERY_INFRA_TRAEFIK_PREFIX")) {
      errors.push("api Traefik router names must interpolate BONDERY_INFRA_TRAEFIK_PREFIX");
    }
    if (HARDCODED_API_ROUTER_RE.test(api)) {
      errors.push("api Traefik router names must not be hardcoded as bondery-api");
    }
    if (!DOKPLOY_NETWORK_RE.test(api) || !INTERNAL_NETWORK_RE.test(api)) {
      errors.push("api must join both dokploy-network and internal");
    }
    if (!API_NETWORK_ALIAS_RE.test(api)) {
      errors.push(
        "api must publish a unique dokploy-network alias from BONDERY_INFRA_TRAEFIK_PREFIX",
      );
    }
    if (api.includes("http://seaweedfs-s3:8333")) {
      errors.push(
        "api must not use http://seaweedfs-s3:8333 — that DNS name collides on shared dokploy-network",
      );
    }
    if (!S3_ENDPOINT_PREFIX_RE.test(api)) {
      errors.push("api must derive BONDERY_PRIVATE_S3_ENDPOINT from BONDERY_INFRA_TRAEFIK_PREFIX");
    }
    if (api.includes("@db:5432")) {
      errors.push("api must not use DATABASE_URL host db — use BONDERY_INFRA_TRAEFIK_PREFIX-db");
    }
    if (!DATABASE_URL_PREFIX_RE.test(api)) {
      errors.push("api must derive DATABASE_URL host from BONDERY_INFRA_TRAEFIK_PREFIX");
    }
    if (!DB_HEALTHY_RE.test(api)) {
      errors.push("api must depends_on db with condition: service_healthy");
    }
    if (KONG_HEALTHY_RE.test(api)) {
      errors.push("api must not depends_on kong (Supabase stack removed)");
    }
    if (!PRE_START_RE.test(api)) {
      errors.push("api must define pre_start init containers");
    }
    if (!api.includes("apps/api/dist/cli/release-migrate.js")) {
      errors.push("api pre_start must run release-migrate CLI");
    }
    if (!api.includes("apps/api/dist/cli/ensure-storage-buckets.js")) {
      errors.push("api pre_start must run ensure-storage-buckets CLI");
    }
    checkHttpRedirect(api, "api");
  }

  if (redis) {
    if (TRAEFIK_LABEL_RE.test(redis)) {
      errors.push("redis must not carry Traefik labels");
    }
    if (DOKPLOY_NETWORK_RE.test(redis)) {
      errors.push("redis must not join dokploy-network");
    }
    if (!INTERNAL_NETWORK_RE.test(redis)) {
      errors.push("redis must join the private internal network");
    }
    if (!REDIS_NETWORK_ALIAS_RE.test(redis)) {
      errors.push("redis must publish a unique internal alias from BONDERY_INFRA_TRAEFIK_PREFIX");
    }
  }

  errors.push(...checkRedisTls({ root, serviceBlock }));
  errors.push(...checkPostgresTls({ postgresText, root, serviceBlock }));
  errors.push(...checkStorageTls({ root, serviceBlock }));
  errors.push(...checkApiTls({ root, serviceBlock }));

  if (db) {
    if (TRAEFIK_LABEL_RE.test(db)) {
      errors.push("db must not carry Traefik labels");
    }
    if (DOKPLOY_NETWORK_RE.test(db)) {
      errors.push("db must not join dokploy-network");
    }
    if (!INTERNAL_NETWORK_RE.test(db)) {
      errors.push("db must join the private internal network");
    }
    if (!HEALTHCHECK_RE.test(db)) {
      errors.push("db must define a healthcheck");
    }
    if (!DB_NETWORK_ALIAS_RE.test(db)) {
      errors.push("db must publish a unique internal alias from BONDERY_INFRA_TRAEFIK_PREFIX");
    }
    if (!POSTGRES_HOST_PORT_RE.test(db)) {
      errors.push(
        "db must publish 127.0.0.1 and interpolate BONDERY_INFRA_POSTGRES_HOST_PORT (default 5432)",
      );
    }
    if (PUBLIC_POSTGRES_BIND_RE.test(db) || WILDCARD_POSTGRES_BIND_RE.test(db)) {
      errors.push("db must not publish Postgres on a public interface");
    }
  }

  if (s3) {
    if (!STORAGE_NETWORK_ALIAS_RE.test(s3)) {
      errors.push(
        "seaweedfs-s3 must publish a unique dokploy-network alias from BONDERY_INFRA_TRAEFIK_PREFIX",
      );
    }
    checkHttpRedirect(s3, "storage");
  }

  for (const name of ["seaweedfs-master", "seaweedfs-volume", "seaweedfs-filer"]) {
    if (!new RegExp(`BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\\}-${name}`).test(seaweedText)) {
      errors.push(`${name} must publish a unique internal alias from BONDERY_INFRA_TRAEFIK_PREFIX`);
    }
  }

  if (errors.length > 0) {
    console.error("deploy/bondery compose checks failed:\n");
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("deploy/bondery compose checks passed");
}

main();
