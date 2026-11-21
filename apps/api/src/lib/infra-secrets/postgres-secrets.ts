/**
 * Creates the TLS material that protects the bundled Compose Postgres.
 *
 * The `stack-secrets` one-shot Compose service runs this before Postgres starts. Each directory
 * is its own volume, so every container mounts only what it needs:
 *
 * - `ca/` (this job only): `ca.key`, `ca.crt`. A private CA that signs the server certificate.
 * - `server/` (this job and `db`): `tls.key`, `tls.crt`. The db entrypoint copies them into a
 *   tmpfs owned by the postgres user, because Postgres refuses a key that others can read.
 * - `client/` (this job and `api`): `ca.crt` (what clients trust) and `server.crt` (public copy,
 *   so the API can warn before the server certificate expires).
 *
 * Clients trust the CA, not the server certificate. The server certificate can be reissued
 * without any client change, and ops tools (psql over an SSH tunnel) import one CA file.
 *
 * It is idempotent. It keeps a valid CA and server certificate, and reissues the server
 * certificate when it is missing, expires soon, misses a hostname, or was signed by another CA.
 * See docs/deploy/secrets.mdx for rotation.
 */

import { chmod, chown, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { readOptional, writeAtomic } from "./files.js";
import { API_CONTAINER_UID, LOOPBACK_IP } from "./ownership.js";
import { ensureCaSignedCertificate } from "./private-ca.js";
import type { CertificateNames } from "./x509.js";

export const POSTGRES_SERVER_RENEW_BEFORE_DAYS = 90;

export type PostgresSecretPaths = {
  caCertFile: string;
  caDir: string;
  caKeyFile: string;
  clientCaFile: string;
  clientDir: string;
  clientServerCertFile: string;
  serverCertFile: string;
  serverDir: string;
  serverKeyFile: string;
};

export function postgresSecretPaths(root: string): PostgresSecretPaths {
  const caDir = join(root, "ca");
  const serverDir = join(root, "server");
  const clientDir = join(root, "client");
  return {
    caCertFile: join(caDir, "ca.crt"),
    caDir,
    caKeyFile: join(caDir, "ca.key"),
    clientCaFile: join(clientDir, "ca.crt"),
    clientDir,
    clientServerCertFile: join(clientDir, "server.crt"),
    serverCertFile: join(serverDir, "tls.crt"),
    serverDir,
    serverKeyFile: join(serverDir, "tls.key"),
  };
}

/**
 * Names clients use to reach the bundled Postgres: the Compose service, the stack alias the API
 * connects to, and loopback for SSH tunnels and local development.
 */
export function postgresCertificateNames(prefix: string): CertificateNames {
  const dns = new Set(["db", "localhost"]);
  const trimmedPrefix = prefix.trim();
  if (trimmedPrefix) {
    dns.add(`${trimmedPrefix}-db`);
  }
  return { dns: [...dns], ip: [LOOPBACK_IP] };
}

export type EnsurePostgresSecretsOptions = {
  /** Make `client/` owned by the API container user. Needs root. */
  chownToContainerUsers: boolean;
  /**
   * Local development: the files live in a host folder that the dev db container bind-mounts.
   * Directories stay readable so the host user can inspect them; keys stay 0600.
   */
  localDev?: boolean;
  log: (message: string) => void;
  now?: Date;
  prefix: string;
  root: string;
};

export type EnsurePostgresSecretsResult = {
  authorityGenerated: boolean;
  serverCertificateGenerated: boolean;
};

export async function ensurePostgresSecrets(
  options: EnsurePostgresSecretsOptions,
): Promise<EnsurePostgresSecretsResult> {
  const paths = postgresSecretPaths(options.root);
  const privateDirMode = options.localDev ? 0o755 : 0o700;

  await mkdir(paths.caDir, { mode: privateDirMode, recursive: true });
  await mkdir(paths.serverDir, { mode: privateDirMode, recursive: true });
  await mkdir(paths.clientDir, { mode: 0o755, recursive: true });

  const { authority, authorityGenerated, certificateGenerated, replacedExisting } =
    await ensureCaSignedCertificate({
      authorityCommonName: "Bondery bundled Postgres CA",
      certificateCommonName: "Bondery bundled Postgres",
      label: "Postgres",
      log: options.log,
      names: postgresCertificateNames(options.prefix),
      now: options.now,
      paths: {
        caCertFile: paths.caCertFile,
        caKeyFile: paths.caKeyFile,
        certFile: paths.serverCertFile,
        keyFile: paths.serverKeyFile,
      },
      renewBeforeDays: POSTGRES_SERVER_RENEW_BEFORE_DAYS,
    });
  if (replacedExisting) {
    options.log(
      options.localDev
        ? "A running Postgres keeps the old certificate. Load the new one: pnpm run stop:postgres && pnpm run start:postgres"
        : "A running Postgres keeps the old certificate. Load the new one: docker compose up -d --force-recreate db api",
    );
  }

  // Clients trust the CA. The server certificate copy is public and only feeds expiry warnings.
  const serverCertificatePem = (await readOptional(paths.serverCertFile)) ?? "";
  await writeAtomic(paths.clientCaFile, authority.certificatePem, 0o644);
  await writeAtomic(paths.clientServerCertFile, serverCertificatePem, 0o644);

  if (options.chownToContainerUsers) {
    for (const path of [paths.clientDir, paths.clientCaFile, paths.clientServerCertFile]) {
      await chown(path, API_CONTAINER_UID, API_CONTAINER_UID);
    }
  }
  await chmod(paths.caDir, privateDirMode);
  await chmod(paths.serverDir, privateDirMode);

  return { authorityGenerated, serverCertificateGenerated: certificateGenerated };
}
