/**
 * Postgres TLS rules for deploy/bondery compose (see docs/adr/0029-postgres-tls.mdx):
 * - every stack variant: the stack-secrets job writes one volume per consumer, and the api
 *   verifies the server against the stack CA with settings that .env cannot override;
 * - the shared db service starts through the TLS wrapper, and its hba file rejects plaintext;
 * - the dev database, the external-Postgres overlay, and the override example keep TLS and
 *   loopback-only ports.
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

/** The db TLS wrapper, in either flow-sequence spacing a YAML formatter may produce. */
const TLS_WRAPPER_ENTRYPOINT =
  /entrypoint:\s*\[\s*"\/bin\/sh",\s*"\/etc\/bondery\/entrypoint\.sh"\s*\]/;
const DATABASE_SSL_MODE_VERIFY_FULL_RE = /^\s+DATABASE_SSL_MODE: verify-full\s*$/m;
const DATABASE_SSL_ROOT_CERT_FILE_RE =
  /^\s+DATABASE_SSL_ROOT_CERT_FILE: \/bondery-postgres\/client\/ca\.crt\s*$/m;
const POSTGRES_TLS_CA_OR_SERVER_VOLUME_RE = /- postgres-tls-(?:ca|server):/;
const DATABASE_URL_SSLMODE_RE = /DATABASE_URL:[^\n]*sslmode/;
const STACK_SECRETS_COMPLETED_RE =
  /stack-secrets:\s*\n\s*condition:\s*service_completed_successfully/;
const POSTGRES_TMPFS_RE = /tmpfs:\s*\n\s*- \/run\/bondery-postgres/;
const POSTGRES_SSL_ON_RE = /-c ssl=on/;
const POSTGRES_HBA_FILE_RE = /hba_file=\/etc\/bondery\/pg_hba\.conf/;
const POSTGRES_SSL_MIN_PROTOCOL_RE = /ssl_min_protocol_version=TLSv1\.[23]/;
const POSTGRES_KEY_INSTALL_RE = /install -o postgres -g postgres -m 0600 [^\n]*tls\.key/;
const POSTGRES_TLS_CA_OR_CLIENT_VOLUME_RE = /- postgres-tls-(?:ca|client):/;
const HASH_COMMENT_RE = /#.*/;
const WHITESPACE_SPLIT_RE = /\s+/;
const DEV_DB_LOOPBACK_PORT_RE = /- "127\.0\.0\.1:54322:5432"/;
const PUBLIC_POSTGRES_PORT_RE = /- "(?:0\.0\.0\.0:)?\d+:5432"/;
const EXTERNAL_DATABASE_SSL_MODE_RE = /DATABASE_SSL_MODE: \$\{DATABASE_SSL_MODE:-verify-full\}/;
const BUNDLED_POSTGRES_PROFILE_RE = /profiles:\s*\[\s*"bundled-postgres"\s*\]/;

/**
 * @param {{ postgresText: string; root: string; serviceBlock: (name: string, source: string) => string }} context
 * @returns {string[]}
 */
export function checkPostgresTls({ postgresText, root, serviceBlock }) {
  const errors = [];

  /**
   * Postgres TLS, client side, in every stack variant: the stack-secrets job writes one volume
   * per consumer, and the api verifies the server against the stack CA with settings that .env
   * cannot override.
   */
  function checkPostgresTlsClients(label, source) {
    const fail = (message) => {
      errors.push(`${label}: ${message}`);
    };
    const apiBlock = serviceBlock("api", source);
    const secretsBlock = serviceBlock("stack-secrets", source);
    if (!(apiBlock && secretsBlock)) {
      return;
    }
    for (const mount of [
      "- postgres-tls-ca:/bondery-postgres/ca",
      "- postgres-tls-server:/bondery-postgres/server",
      "- postgres-tls-client:/bondery-postgres/client",
    ]) {
      if (!secretsBlock.includes(mount)) {
        fail(`stack-secrets must mount ${mount.slice(2)}`);
      }
    }
    if (!DATABASE_SSL_MODE_VERIFY_FULL_RE.test(apiBlock)) {
      fail("api must set DATABASE_SSL_MODE: verify-full (TLS that checks the CA and hostname)");
    }
    if (!DATABASE_SSL_ROOT_CERT_FILE_RE.test(apiBlock)) {
      fail(
        "api must trust the stack CA: DATABASE_SSL_ROOT_CERT_FILE: /bondery-postgres/client/ca.crt",
      );
    }
    if (!apiBlock.includes("- postgres-tls-client:/bondery-postgres/client:ro")) {
      fail("api must mount postgres-tls-client read-only");
    }
    if (POSTGRES_TLS_CA_OR_SERVER_VOLUME_RE.test(apiBlock)) {
      fail("api must not mount the Postgres CA or server key volumes");
    }
    if (DATABASE_URL_SSLMODE_RE.test(apiBlock)) {
      fail("api DATABASE_URL must not carry sslmode; TLS comes from DATABASE_SSL_*");
    }
  }

  /** Postgres TLS, server side: the shared db service, its wrapper, and its hba file. */
  function checkPostgresTlsServer() {
    const label = "docker-compose.postgres.yml";
    const fail = (message) => {
      errors.push(`${label}: ${message}`);
    };
    const dbBlock = serviceBlock("db", postgresText);
    if (!dbBlock) {
      return;
    }
    if (!TLS_WRAPPER_ENTRYPOINT.test(dbBlock)) {
      fail(
        'db must start through the TLS wrapper (entrypoint: ["/bin/sh", "/etc/bondery/entrypoint.sh"])',
      );
    }
    if (!STACK_SECRETS_COMPLETED_RE.test(dbBlock)) {
      fail("db must depends_on stack-secrets with condition: service_completed_successfully");
    }
    if (!POSTGRES_TMPFS_RE.test(dbBlock)) {
      fail("db must copy the TLS key into a tmpfs at /run/bondery-postgres");
    }
    for (const mount of [
      "- postgres-tls-server:/bondery-postgres/server:ro",
      "- ./postgres/entrypoint.sh:/etc/bondery/entrypoint.sh:ro",
      "- ./postgres/pg_hba.conf:/etc/bondery/pg_hba.conf:ro",
    ]) {
      if (!dbBlock.includes(mount)) {
        fail(`db must mount ${mount.slice(2)}`);
      }
    }
    if (POSTGRES_TLS_CA_OR_CLIENT_VOLUME_RE.test(dbBlock)) {
      fail("db must not mount the Postgres CA or client volumes");
    }

    const wrapper = readFileSync(resolve(root, "postgres/entrypoint.sh"), "utf8");
    for (const [pattern, message] of [
      [POSTGRES_SSL_ON_RE, "postgres/entrypoint.sh must start Postgres with -c ssl=on"],
      [POSTGRES_HBA_FILE_RE, "postgres/entrypoint.sh must use the managed hba file"],
      [
        POSTGRES_SSL_MIN_PROTOCOL_RE,
        "postgres/entrypoint.sh must set ssl_min_protocol_version to TLSv1.2 or TLSv1.3",
      ],
      [
        POSTGRES_KEY_INSTALL_RE,
        "postgres/entrypoint.sh must copy the key with mode 0600 owned by postgres",
      ],
    ]) {
      if (!pattern.test(wrapper)) {
        fail(message);
      }
    }

    const hbaLines = readFileSync(resolve(root, "postgres/pg_hba.conf"), "utf8")
      .split("\n")
      .map((line) => line.replace(HASH_COMMENT_RE, "").trim())
      .filter(Boolean)
      .map((line) => line.split(WHITESPACE_SPLIT_RE));
    for (const address of ["0.0.0.0/0", "::/0"]) {
      if (
        hbaLines.every(
          ([type, , , addr, method]) =>
            type !== "hostnossl" || addr !== address || method !== "reject",
        )
      ) {
        fail(`postgres/pg_hba.conf must reject plaintext TCP from ${address} (hostnossl … reject)`);
      }
    }
    for (const line of hbaLines) {
      const [type] = line;
      const method = line.at(-1);
      if (type === "host") {
        fail(
          "postgres/pg_hba.conf must not have plain host lines (they allow TCP without TLS); use hostssl",
        );
      }
      if (type !== "local" && method === "trust") {
        fail(`postgres/pg_hba.conf must not trust TCP connections (${line.join(" ")})`);
      }
    }
  }

  for (const file of STACK_FILES) {
    checkPostgresTlsClients(file, readFileSync(resolve(root, file), "utf8"));
  }
  checkPostgresTlsServer();

  /** Local dev Postgres has the same TLS rules as the stack, and only listens on loopback. */
  {
    const label = "docker-compose.dev-db.yml";
    const devText = readFileSync(resolve(root, label), "utf8");
    const fail = (message) => {
      errors.push(`${label}: ${message}`);
    };
    if (!TLS_WRAPPER_ENTRYPOINT.test(devText)) {
      fail("db must start through the TLS wrapper (postgres/entrypoint.sh)");
    }
    if (!devText.includes("./postgres/pg_hba.conf:/etc/bondery/pg_hba.conf:ro")) {
      fail("db must use the managed hba file that rejects plaintext");
    }
    if (!DEV_DB_LOOPBACK_PORT_RE.test(devText)) {
      fail("db must publish 54322 on 127.0.0.1 only");
    }
    if (PUBLIC_POSTGRES_PORT_RE.test(devText)) {
      fail("db must not publish a port on all interfaces");
    }
  }

  /** The external-Postgres overlay must keep verified TLS as its default. */
  {
    const label = "docker-compose.external-postgres.yml";
    const overlayText = readFileSync(resolve(root, label), "utf8");
    if (!EXTERNAL_DATABASE_SSL_MODE_RE.test(overlayText)) {
      errors.push(`${label}: api DATABASE_SSL_MODE must default to verify-full`);
    }
    if (!BUNDLED_POSTGRES_PROFILE_RE.test(overlayText)) {
      errors.push(`${label}: the bundled db must move to a profile that never starts`);
    }
  }

  /** The override example is copied by self-hosters as is: it must not publish Postgres publicly. */
  {
    const label = "docker-compose.override.yml.example";
    const overrideText = readFileSync(resolve(root, label), "utf8");
    if (PUBLIC_POSTGRES_PORT_RE.test(overrideText)) {
      errors.push(`${label}: db must publish Postgres on 127.0.0.1 only`);
    }
  }

  return errors;
}
