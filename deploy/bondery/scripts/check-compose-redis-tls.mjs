/**
 * Redis mutual TLS rules for deploy/bondery compose (see docs/adr/0032-redis-mtls.mdx):
 * - every stack variant: bundled Redis requires TLS 1.3, a client certificate, and a password;
 * - stack-secrets writes one volume per consumer; legacy redis-secrets is read-only for migration;
 * - the dev Redis bind-mounts server/ only and listens on loopback.
 *
 * Called by check-compose.mjs. Returns error messages; an empty list means the rules hold.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const STACK_FILES = [
  "docker-compose.yml",
  "docker-compose.production.yml",
  "docker-compose.self-hosted.yml",
];

const REDIS_PLAINTEXT_PORT_RE = /- --port\s*\n\s*- "0"/u;
const REDIS_TLS_PORT_RE = /- --tls-port\s*\n\s*- "6379"/u;
const REDIS_REQUIREPASS_OR_UNPROTECTED_RE = /requirepass|--protected-mode\s*\n\s*- "?no/u;
const STACK_SECRETS_COMPLETED_RE =
  /stack-secrets:\s*\n\s*condition:\s*service_completed_successfully/u;
const REDIS_CLI_MTLS_RE = /redis-cli --tls[\s\S]*--cert[\s\S]*--key[\s\S]*--cacert/u;
const REDIS_TLS_AUTH_CLIENTS_YES_RE = /- --tls-auth-clients\s*\n\s*- "yes"/u;
const REDIS_TLS_AUTH_CLIENTS_BAD_RE = /- --tls-auth-clients\s*\n\s*- "(?:no|optional)"/u;
const REDIS_TLS_PROTOCOLS_V13_RE = /- --tls-protocols\s*\n\s*- TLSv1\.3/u;
const REDIS_TLS_CA_OR_CLIENT_MOUNT_RE = /- redis-tls-(?:ca|client):/u;
const REDIS_TLS_CA_OR_SERVER_MOUNT_RE = /- redis-tls-(?:ca|server):/u;
const NETWORK_MODE_NONE_RE = /network_mode:\s*none/u;
const REDIS_URL_REDISS_RE =
  /BONDERY_PRIVATE_REDIS_URL: rediss:\/\/\$\{BONDERY_INFRA_TRAEFIK_PREFIX:-bondery\}-redis:6379\s*$/mu;
const DEV_REDIS_SERVER_BIND_RE = /source: \.\.\/\.\.\/\.temp\/redis-secrets\/server/u;
const DEV_REDIS_PARENT_BIND_RE = /source: \.\.\/\.\.\/\.temp\/redis-secrets\s*$/mu;
const DEV_REDIS_LOOPBACK_PORT_RE = /- "127\.0\.0\.1:26636:6379"/u;
const PUBLIC_REDIS_PORT_RE = /- "(?:0\.0\.0\.0:)?\d+:6379"/u;
const REDIS_SERVER_MTLS_FLAGS = [
  "--tls-cert-file",
  "--tls-key-file",
  "--tls-ca-cert-file",
  "--aclfile",
];
const STACK_SECRETS_REDIS_MOUNTS = [
  "- redis-tls-ca:/bondery-redis/ca",
  "- redis-tls-server:/bondery-redis/server",
  "- redis-tls-client:/bondery-redis/client",
  "- redis-secrets:/bondery-redis-legacy:ro",
];

/**
 * @param {string} redisBlock
 * @param {(message: string) => void} fail
 */
function checkRedisServerFlags(redisBlock, fail) {
  if (!REDIS_PLAINTEXT_PORT_RE.test(redisBlock)) {
    fail('redis must disable the plaintext port (--port "0")');
  }
  if (!REDIS_TLS_PORT_RE.test(redisBlock)) {
    fail('redis must serve TLS on 6379 (--tls-port "6379")');
  }
  for (const flag of REDIS_SERVER_MTLS_FLAGS) {
    if (!redisBlock.includes(`- ${flag}`)) {
      fail(`redis must set ${flag} from the redis-tls-server volume`);
    }
  }
  if (REDIS_TLS_AUTH_CLIENTS_BAD_RE.test(redisBlock)) {
    fail('redis must require client certificates (--tls-auth-clients "yes")');
  }
  if (!REDIS_TLS_AUTH_CLIENTS_YES_RE.test(redisBlock)) {
    fail('redis must require client certificates (--tls-auth-clients "yes")');
  }
  if (!REDIS_TLS_PROTOCOLS_V13_RE.test(redisBlock)) {
    fail("redis must serve TLS 1.3 only (--tls-protocols TLSv1.3)");
  }
  if (REDIS_REQUIREPASS_OR_UNPROTECTED_RE.test(redisBlock)) {
    fail("redis must authenticate through the ACL file, not requirepass or protected-mode no");
  }
  if (
    !REDIS_CLI_MTLS_RE.test(redisBlock) ||
    !redisBlock.includes("REDISCLI_AUTH") ||
    !redisBlock.includes("--cert") ||
    !redisBlock.includes("--key")
  ) {
    fail("redis healthcheck must connect with TLS, a client certificate, the CA, and the password");
  }
}

/**
 * @param {string} redisBlock
 * @param {(message: string) => void} fail
 */
function checkRedisServerTls(redisBlock, fail) {
  checkRedisServerFlags(redisBlock, fail);
  if (!STACK_SECRETS_COMPLETED_RE.test(redisBlock)) {
    fail("redis must depends_on stack-secrets with condition: service_completed_successfully");
  }
  if (!redisBlock.includes("- redis-tls-server:/bondery-redis/server:ro")) {
    fail("redis must mount redis-tls-server read-only at /bondery-redis/server");
  }
  if (REDIS_TLS_CA_OR_CLIENT_MOUNT_RE.test(redisBlock) || redisBlock.includes("redis-secrets")) {
    fail("redis must not mount redis-tls-ca, redis-tls-client, or redis-secrets");
  }
}

/**
 * @param {string} secretsBlock
 * @param {(message: string) => void} fail
 */
function checkStackSecretsRedis(secretsBlock, fail) {
  if (!secretsBlock.includes("apps/api/dist/cli/ensure-stack-secrets.js")) {
    fail("stack-secrets must run the ensure-stack-secrets CLI");
  }
  if (!NETWORK_MODE_NONE_RE.test(secretsBlock)) {
    fail("stack-secrets must run without a network (network_mode: none)");
  }
  for (const mount of STACK_SECRETS_REDIS_MOUNTS) {
    if (!secretsBlock.includes(mount)) {
      fail(`stack-secrets must mount ${mount.slice(2)}`);
    }
  }
  if (secretsBlock.includes("- redis-secrets:/bondery-redis\n")) {
    fail(
      "stack-secrets must mount redis-secrets at /bondery-redis-legacy read-only, not /bondery-redis",
    );
  }
}

/**
 * @param {string} apiBlock
 * @param {(message: string) => void} fail
 */
function checkApiRedisClient(apiBlock, fail) {
  if (!REDIS_URL_REDISS_RE.test(apiBlock)) {
    fail(
      "api BONDERY_PRIVATE_REDIS_URL must be rediss://$" +
        "{BONDERY_INFRA_TRAEFIK_PREFIX:-bondery}-redis:6379 (TLS, not overridable from .env)",
    );
  }
  if (!apiBlock.includes("BONDERY_PRIVATE_REDIS_PASSWORD_FILE: /bondery-redis/client/password")) {
    fail("api must read the Redis password from BONDERY_PRIVATE_REDIS_PASSWORD_FILE");
  }
  if (!apiBlock.includes("BONDERY_PRIVATE_REDIS_TLS_CA_FILE: /bondery-redis/client/ca.crt")) {
    fail("api must trust the Redis CA with BONDERY_PRIVATE_REDIS_TLS_CA_FILE");
  }
  if (!apiBlock.includes("BONDERY_PRIVATE_REDIS_TLS_CERT_FILE: /bondery-redis/client/tls.crt")) {
    fail("api must present a client certificate with BONDERY_PRIVATE_REDIS_TLS_CERT_FILE");
  }
  if (!apiBlock.includes("BONDERY_PRIVATE_REDIS_TLS_KEY_FILE: /bondery-redis/client/tls.key")) {
    fail("api must present a client key with BONDERY_PRIVATE_REDIS_TLS_KEY_FILE");
  }
  if (!apiBlock.includes("- redis-tls-client:/bondery-redis/client:ro")) {
    fail("api must mount redis-tls-client read-only at /bondery-redis/client");
  }
  if (REDIS_TLS_CA_OR_SERVER_MOUNT_RE.test(apiBlock) || apiBlock.includes("redis-secrets")) {
    fail("api must not mount redis-tls-ca, redis-tls-server, or redis-secrets");
  }
}

/**
 * @param {string} label
 * @param {string} source
 * @param {(name: string, source: string) => string} serviceBlock
 * @returns {string[]}
 */
function checkStackRedisTls(label, source, serviceBlock) {
  const errors = [];
  const fail = (message) => {
    errors.push(`${label}: ${message}`);
  };
  const redisBlock = serviceBlock("redis", source);
  const apiBlock = serviceBlock("api", source);
  const secretsBlock = serviceBlock("stack-secrets", source);
  if (!(redisBlock && apiBlock && secretsBlock)) {
    return errors;
  }
  checkRedisServerTls(redisBlock, fail);
  checkStackSecretsRedis(secretsBlock, fail);
  checkApiRedisClient(apiBlock, fail);
  return errors;
}

/**
 * @param {string} devText
 * @returns {string[]}
 */
function checkDevRedisTls(devText) {
  const label = "docker-compose.dev-redis.yml";
  const errors = [];
  const fail = (message) => {
    errors.push(`${label}: ${message}`);
  };
  checkRedisServerFlags(devText, fail);
  if (!DEV_REDIS_SERVER_BIND_RE.test(devText)) {
    fail("redis must bind-mount .temp/redis-secrets/server at /bondery-redis/server");
  }
  if (DEV_REDIS_PARENT_BIND_RE.test(devText)) {
    fail("redis must bind-mount .temp/redis-secrets/server, not the parent directory");
  }
  if (!DEV_REDIS_LOOPBACK_PORT_RE.test(devText)) {
    fail("redis must publish 26636 on 127.0.0.1 only");
  }
  if (PUBLIC_REDIS_PORT_RE.test(devText)) {
    fail("redis must not publish a port on all interfaces");
  }
  return errors;
}

/**
 * @param {{ root: string; serviceBlock: (name: string, source: string) => string }} context
 * @returns {string[]}
 */
export function checkRedisTls({ root, serviceBlock }) {
  const errors = [];
  for (const file of STACK_FILES) {
    errors.push(
      ...checkStackRedisTls(file, readFileSync(resolve(root, file), "utf8"), serviceBlock),
    );
  }
  errors.push(
    ...checkDevRedisTls(readFileSync(resolve(root, "docker-compose.dev-redis.yml"), "utf8")),
  );
  return errors;
}
