#!/usr/bin/env node
/**
 * Mechanical checks for deploy/bondery compose:
 * - webapp must never receive PRIVATE_* / BONDERY_PRIVATE_* secrets (except allowed PostHog)
 * - api and webapp must carry Traefik Host() rules and derive public URLs from domains
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
import { checkStorageTls } from "./check-compose-storage-tls.mjs";

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
    const match = output.match(/v?(\d+)\.(\d+)\.(\d+)/);
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

  if (!/^\s*include:\s*$/m.test(mainText) || !mainText.includes("docker-compose.postgres.yml")) {
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

  if (/8333\/status/.test(seaweedText)) {
    errors.push("seaweedfs-s3 healthcheck must not probe GET /status (empty 200 is not S3-ready)");
  }

  if (!/BONDERY_PRIVATE_S3_ACCESS_KEY_ID/.test(seaweedText)) {
    errors.push("seaweedfs-s3 must pass BONDERY_PRIVATE_S3_ACCESS_KEY_ID from compose env");
  }

  if (!seaweedText.includes("BONDERY_INFRA_TRAEFIK_PREFIX")) {
    errors.push("seaweedfs-s3 Traefik router names must interpolate BONDERY_INFRA_TRAEFIK_PREFIX");
  }
  if (/traefik\.http\.routers\.bondery-storage/.test(seaweedText)) {
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
    const next = rest.search(/^ {2}[a-zA-Z0-9_-]+:\s*$/m);
    return next === -1 ? source.slice(start) : source.slice(start, start + 1 + next);
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
    if (/^\s*env_file:/m.test(webapp)) {
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
    if (!/traefik\.enable=true/.test(webapp)) {
      errors.push("webapp must enable Traefik (traefik.enable=true)");
    }
    if (!webapp.includes("BONDERY_INFRA_TRAEFIK_PREFIX")) {
      errors.push("webapp Traefik router names must interpolate BONDERY_INFRA_TRAEFIK_PREFIX");
    }
    if (/traefik\.http\.routers\.bondery-webapp/.test(webapp)) {
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
    if (
      !/BONDERY_INFRA_INTERNAL_API_URL:\s*https:\/\/\$\{BONDERY_INFRA_TRAEFIK_PREFIX/.test(webapp)
    ) {
      errors.push(
        "webapp must derive BONDERY_INFRA_INTERNAL_API_URL from BONDERY_INFRA_TRAEFIK_PREFIX",
      );
    }
    if (!/BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-webapp/.test(webapp)) {
      errors.push(
        "webapp must publish a unique dokploy-network alias from BONDERY_INFRA_TRAEFIK_PREFIX",
      );
    }
    if (!/BONDERY_PUBLIC_API_URL:\s*https:\/\/\$\{BONDERY_INFRA_API_DOMAIN/.test(webapp)) {
      errors.push(
        "webapp must derive BONDERY_PUBLIC_API_URL from https:// + BONDERY_INFRA_API_DOMAIN",
      );
    }
  }

  if (api) {
    if (!api.includes("BONDERY_INFRA_API_DOMAIN")) {
      errors.push("api must define a Traefik Host() rule using BONDERY_INFRA_API_DOMAIN");
    }
    if (!/BONDERY_PUBLIC_API_URL:\s*https:\/\/\$\{BONDERY_INFRA_API_DOMAIN/.test(api)) {
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
    if (!/traefik\.enable=true/.test(api)) {
      errors.push("api must enable Traefik (traefik.enable=true)");
    }
    if (!api.includes("BONDERY_INFRA_TRAEFIK_PREFIX")) {
      errors.push("api Traefik router names must interpolate BONDERY_INFRA_TRAEFIK_PREFIX");
    }
    if (/traefik\.http\.routers\.bondery-api/.test(api)) {
      errors.push("api Traefik router names must not be hardcoded as bondery-api");
    }
    if (!/dokploy-network/.test(api) || !/internal/.test(api)) {
      errors.push("api must join both dokploy-network and internal");
    }
    if (!/BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-api/.test(api)) {
      errors.push(
        "api must publish a unique dokploy-network alias from BONDERY_INFRA_TRAEFIK_PREFIX",
      );
    }
    if (api.includes("http://seaweedfs-s3:8333")) {
      errors.push(
        "api must not use http://seaweedfs-s3:8333 — that DNS name collides on shared dokploy-network",
      );
    }
    if (!/BONDERY_PRIVATE_S3_ENDPOINT:\s*https:\/\/\$\{BONDERY_INFRA_TRAEFIK_PREFIX/.test(api)) {
      errors.push("api must derive BONDERY_PRIVATE_S3_ENDPOINT from BONDERY_INFRA_TRAEFIK_PREFIX");
    }
    if (api.includes("@db:5432")) {
      errors.push("api must not use DATABASE_URL host db — use BONDERY_INFRA_TRAEFIK_PREFIX-db");
    }
    if (!/DATABASE_URL:.*\$\{BONDERY_INFRA_TRAEFIK_PREFIX/.test(api)) {
      errors.push("api must derive DATABASE_URL host from BONDERY_INFRA_TRAEFIK_PREFIX");
    }
    if (!/db:\s*\n\s*condition:\s*service_healthy/.test(api)) {
      errors.push("api must depends_on db with condition: service_healthy");
    }
    if (/kong:\s*\n\s*condition:\s*service_healthy/.test(api)) {
      errors.push("api must not depends_on kong (Supabase stack removed)");
    }
    if (!/pre_start:/m.test(api)) {
      errors.push("api must define pre_start init containers");
    }
    if (!api.includes("apps/api/dist/cli/release-migrate.js")) {
      errors.push("api pre_start must run release-migrate CLI");
    }
    if (!api.includes("apps/api/dist/cli/ensure-storage-buckets.js")) {
      errors.push("api pre_start must run ensure-storage-buckets CLI");
    }
  }

  if (redis) {
    if (/traefik\./.test(redis)) {
      errors.push("redis must not carry Traefik labels");
    }
    if (/dokploy-network/.test(redis)) {
      errors.push("redis must not join dokploy-network");
    }
    if (!/internal/.test(redis)) {
      errors.push("redis must join the private internal network");
    }
    if (!/BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-redis/.test(redis)) {
      errors.push("redis must publish a unique internal alias from BONDERY_INFRA_TRAEFIK_PREFIX");
    }
  }

  /**
   * Every Redis in every product stack variant requires TLS and authentication
   * (bondery-security: "Redis: TLS and authentication"). The variants are copies, so check each.
   */
  function checkRedisTlsAndAuth(label, source) {
    const fail = (message) => {
      errors.push(`${label}: ${message}`);
    };
    const redisBlock = serviceBlock("redis", source);
    const apiBlock = serviceBlock("api", source);
    const secretsBlock = serviceBlock("stack-secrets", source);
    if (!(redisBlock && apiBlock && secretsBlock)) {
      return;
    }

    if (!/- --port\s*\n\s*- "0"/.test(redisBlock)) {
      fail('redis must disable the plaintext port (--port "0")');
    }
    if (!/- --tls-port\s*\n\s*- "6379"/.test(redisBlock)) {
      fail('redis must serve TLS on 6379 (--tls-port "6379")');
    }
    for (const flag of ["--tls-cert-file", "--tls-key-file", "--aclfile"]) {
      if (!redisBlock.includes(`- ${flag}`)) {
        fail(`redis must set ${flag} from the redis-secrets volume`);
      }
    }
    if (/requirepass|--protected-mode\s*\n\s*- "?no/.test(redisBlock)) {
      fail("redis must authenticate through the ACL file, not requirepass or protected-mode no");
    }
    if (!/stack-secrets:\s*\n\s*condition:\s*service_completed_successfully/.test(redisBlock)) {
      fail("redis must depends_on stack-secrets with condition: service_completed_successfully");
    }
    if (!/redis-cli --tls --cacert/.test(redisBlock) || !redisBlock.includes("REDISCLI_AUTH")) {
      fail("redis healthcheck must connect with TLS and the password");
    }
    if (!secretsBlock.includes("apps/api/dist/cli/ensure-stack-secrets.js")) {
      fail("stack-secrets must run the ensure-stack-secrets CLI");
    }
    if (!/network_mode:\s*none/.test(secretsBlock)) {
      fail("stack-secrets must run without a network (network_mode: none)");
    }
    if (!secretsBlock.includes("- redis-secrets:/bondery-redis")) {
      fail("stack-secrets must mount the redis-secrets volume");
    }

    if (
      !/BONDERY_PRIVATE_REDIS_URL: rediss:\/\/\$\{BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-redis:6379\s*$/m.test(
        apiBlock,
      )
    ) {
      fail(
        "api BONDERY_PRIVATE_REDIS_URL must be rediss://${BONDERY_INFRA_TRAEFIK_PREFIX:-bondery}-redis:6379 (TLS, not overridable from .env)",
      );
    }
    if (!apiBlock.includes("BONDERY_PRIVATE_REDIS_PASSWORD_FILE: /bondery-redis/client/password")) {
      fail("api must read the Redis password from BONDERY_PRIVATE_REDIS_PASSWORD_FILE");
    }
    if (!apiBlock.includes("BONDERY_PRIVATE_REDIS_TLS_CA_FILE: /bondery-redis/client/ca.crt")) {
      fail("api must pin the Redis certificate with BONDERY_PRIVATE_REDIS_TLS_CA_FILE");
    }
    if (!apiBlock.includes("- redis-secrets:/bondery-redis:ro")) {
      fail("api must mount the redis-secrets volume read-only");
    }
  }

  for (const file of [
    "docker-compose.yml",
    "docker-compose.production.yml",
    "docker-compose.self-hosted.yml",
  ]) {
    checkRedisTlsAndAuth(file, readFileSync(resolve(root, file), "utf8"));
  }
  errors.push(...checkPostgresTls({ postgresText, root, serviceBlock }));
  errors.push(...checkStorageTls({ root, serviceBlock }));
  errors.push(...checkApiTls({ root, serviceBlock }));

  /** Local dev Redis has the same TLS and password rules, and only listens on loopback. */
  {
    const label = "docker-compose.dev-redis.yml";
    const devText = readFileSync(resolve(root, label), "utf8");
    const fail = (message) => {
      errors.push(`${label}: ${message}`);
    };
    if (!/- --port\s*\n\s*- "0"/.test(devText)) {
      fail('redis must disable the plaintext port (--port "0")');
    }
    if (!/- --tls-port\s*\n\s*- "6379"/.test(devText)) {
      fail('redis must serve TLS on 6379 (--tls-port "6379")');
    }
    for (const flag of ["--tls-cert-file", "--tls-key-file", "--aclfile"]) {
      if (!devText.includes(`- ${flag}`)) {
        fail(`redis must set ${flag}`);
      }
    }
    if (!/redis-cli --tls --cacert/.test(devText) || !devText.includes("REDISCLI_AUTH")) {
      fail("redis healthcheck must connect with TLS and the password");
    }
    if (!/- "127\.0\.0\.1:26636:6379"/.test(devText)) {
      fail("redis must publish 26636 on 127.0.0.1 only");
    }
    if (/- "(?:0\.0\.0\.0:)?\d+:6379"/.test(devText)) {
      fail("redis must not publish a port on all interfaces");
    }
  }

  if (db) {
    if (/traefik\./.test(db)) {
      errors.push("db must not carry Traefik labels");
    }
    if (/dokploy-network/.test(db)) {
      errors.push("db must not join dokploy-network");
    }
    if (!/internal/.test(db)) {
      errors.push("db must join the private internal network");
    }
    if (!/healthcheck:/m.test(db)) {
      errors.push("db must define a healthcheck");
    }
    if (!/BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-db/.test(db)) {
      errors.push("db must publish a unique internal alias from BONDERY_INFRA_TRAEFIK_PREFIX");
    }
    if (!/127\.0\.0\.1:\$\{BONDERY_INFRA_POSTGRES_HOST_PORT:-5432\}:5432/.test(db)) {
      errors.push(
        "db must publish 127.0.0.1 and interpolate BONDERY_INFRA_POSTGRES_HOST_PORT (default 5432)",
      );
    }
    if (/ports:[\s\S]*["']0\.0\.0\.0:/.test(db) || /ports:[\s\S]*["']\*:/.test(db)) {
      errors.push("db must not publish Postgres on a public interface");
    }
  }

  if (s3 && !/BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-storage/.test(s3)) {
    errors.push(
      "seaweedfs-s3 must publish a unique dokploy-network alias from BONDERY_INFRA_TRAEFIK_PREFIX",
    );
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
