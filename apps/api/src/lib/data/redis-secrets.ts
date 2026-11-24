/**
 * Creates the password, CA, and TLS certificates that protect the bundled Compose Redis.
 *
 * The `stack-secrets` job runs this before Redis starts. Each directory is its own volume:
 *
 * - `ca/`: `ca.crt`, `ca.key` (CA key stays here only)
 * - `server/` (Redis user only): `tls.crt`, `tls.key`, `ca.crt`, `healthcheck.crt`,
 *   `healthcheck.key`, `users.acl`, `password`
 * - `client/` (API user only): `ca.crt`, `tls.crt`, `tls.key`, `password`, `server.crt`
 *
 * It is idempotent. Existing secrets stay. The bundled Redis requires mutual TLS: the server
 * certificate is serverAuth only, and the API and healthcheck each get a separate clientAuth
 * certificate signed by the Redis CA.
 */

import { createHash, randomBytes } from "node:crypto";
import { chmod, chown, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { readOptional, writeAtomic } from "../infra-secrets/files.js";
import { API_CONTAINER_UID, LOOPBACK_IP } from "../infra-secrets/ownership.js";
import { ensureCaSignedCertificate, ensureClientCertificate } from "../infra-secrets/private-ca.js";
import type { CertificateNames } from "../infra-secrets/x509.js";

const REDIS_PASSWORD_BYTES = 32;

function generateRedisPassword(): string {
  return randomBytes(REDIS_PASSWORD_BYTES).toString("base64url");
}

async function resolveRedisPassword(
  paths: RedisSecretPaths,
  legacyRoot: string | undefined,
  log: (message: string) => void,
): Promise<{ password: string; passwordGenerated: boolean }> {
  // Keep client/password. Else copy the legacy password when the CA is not on disk yet.
  // After the CA exists, a missing password is a new password, so rotation does not restore
  // the legacy file.
  const existingPassword = (await readOptional(paths.clientPasswordFile))?.trim();
  if (existingPassword) {
    return { password: existingPassword, passwordGenerated: false };
  }

  const caExists = (await readOptional(paths.caCertFile)) !== null;
  if (!caExists && legacyRoot) {
    const legacyPassword = (await readOptional(join(legacyRoot, "client", "password")))?.trim();
    if (legacyPassword) {
      log("Kept the existing Redis password");
      return { password: legacyPassword, passwordGenerated: false };
    }
  }

  const password = generateRedisPassword();
  log("Generated a new Redis password");
  return { password, passwordGenerated: true };
}

export { API_CONTAINER_UID };

/** `redis` user in the official `redis` image. */
export const REDIS_CONTAINER_UID = 999;

export const REDIS_SERVER_RENEW_BEFORE_DAYS = 90;
export const REDIS_CLIENT_RENEW_BEFORE_DAYS = 90;

export type RedisSecretPaths = {
  aclFile: string;
  caCertFile: string;
  caDir: string;
  caKeyFile: string;
  clientCaFile: string;
  clientCertFile: string;
  clientDir: string;
  clientKeyFile: string;
  clientPasswordFile: string;
  clientServerCertFile: string;
  healthcheckCertFile: string;
  healthcheckKeyFile: string;
  serverCaFile: string;
  serverCertFile: string;
  serverDir: string;
  serverKeyFile: string;
  serverPasswordFile: string;
};

export function redisSecretPaths(root: string): RedisSecretPaths {
  const caDir = join(root, "ca");
  const serverDir = join(root, "server");
  const clientDir = join(root, "client");
  return {
    aclFile: join(serverDir, "users.acl"),
    caCertFile: join(caDir, "ca.crt"),
    caDir,
    caKeyFile: join(caDir, "ca.key"),
    clientCaFile: join(clientDir, "ca.crt"),
    clientCertFile: join(clientDir, "tls.crt"),
    clientDir,
    clientKeyFile: join(clientDir, "tls.key"),
    clientPasswordFile: join(clientDir, "password"),
    clientServerCertFile: join(clientDir, "server.crt"),
    healthcheckCertFile: join(serverDir, "healthcheck.crt"),
    healthcheckKeyFile: join(serverDir, "healthcheck.key"),
    serverCaFile: join(serverDir, "ca.crt"),
    serverCertFile: join(serverDir, "tls.crt"),
    serverDir,
    serverKeyFile: join(serverDir, "tls.key"),
    serverPasswordFile: join(serverDir, "password"),
  };
}

/** Hostnames the API and the Redis healthcheck use to reach Redis. */
export function redisCertificateNames(prefix: string): CertificateNames {
  const dns = new Set(["redis", "localhost"]);
  const trimmedPrefix = prefix.trim();
  if (trimmedPrefix) {
    dns.add(`${trimmedPrefix}-redis`);
  }
  return { dns: [...dns], ip: [LOOPBACK_IP] };
}

/** Redis ACL line for the default user. Stores only the SHA-256 of the password. */
export function buildRedisAclFile(password: string): string {
  const digest = createHash("sha256").update(password, "utf8").digest("hex");
  return `user default on #${digest} ~* &* +@all\n`;
}

export type EnsureRedisSecretsOptions = {
  /** Change ownership to the Redis and API container users. Needs root. */
  chownToContainerUsers: boolean;
  /**
   * Local development: write into a host folder that the Redis container reads through a bind
   * mount. On Linux the files keep the host owner, so they must be readable by the Redis user.
   * Never use this for a deployed stack.
   */
  localDev?: boolean;
  /** Old single-volume layout (`/bondery-redis-legacy` in Compose). Ignored when absent. */
  legacyRoot?: string;
  log: (message: string) => void;
  now?: Date;
  prefix: string;
  root: string;
};

export type EnsureRedisSecretsResult = {
  authorityGenerated: boolean;
  clientCertificatesGenerated: boolean;
  passwordGenerated: boolean;
  serverCertificateGenerated: boolean;
};

export async function ensureRedisSecrets(
  options: EnsureRedisSecretsOptions,
): Promise<EnsureRedisSecretsResult> {
  const paths = redisSecretPaths(options.root);
  const privateDirMode = options.localDev ? 0o755 : 0o700;
  const secretMode = options.localDev ? 0o644 : 0o600;
  const clientSecretMode = 0o600;

  await mkdir(paths.caDir, { mode: privateDirMode, recursive: true });
  await mkdir(paths.serverDir, { mode: privateDirMode, recursive: true });
  await mkdir(paths.clientDir, { mode: privateDirMode, recursive: true });

  const { password, passwordGenerated } = await resolveRedisPassword(
    paths,
    options.legacyRoot,
    options.log,
  );
  await writeAtomic(paths.clientPasswordFile, `${password}\n`, clientSecretMode);
  await writeAtomic(paths.aclFile, buildRedisAclFile(password), secretMode);
  await writeAtomic(paths.serverPasswordFile, `${password}\n`, secretMode);

  const {
    authority,
    authorityGenerated,
    certificateGenerated: serverCertificateGenerated,
    replacedExisting: serverReplaced,
  } = await ensureCaSignedCertificate({
    authorityCommonName: "Bondery bundled Redis CA",
    certificateCommonName: "Bondery bundled Redis",
    label: "Redis",
    log: options.log,
    names: redisCertificateNames(options.prefix),
    now: options.now,
    paths: {
      caCertFile: paths.caCertFile,
      caKeyFile: paths.caKeyFile,
      certFile: paths.serverCertFile,
      keyFile: paths.serverKeyFile,
    },
    renewBeforeDays: REDIS_SERVER_RENEW_BEFORE_DAYS,
  });

  const apiClient = await ensureClientCertificate({
    authority,
    commonName: "Bondery API Redis client",
    label: "Redis API client",
    log: options.log,
    names: { dns: ["redis-client-api"], ip: [] },
    now: options.now,
    paths: {
      certFile: paths.clientCertFile,
      keyFile: paths.clientKeyFile,
    },
    renewBeforeDays: REDIS_CLIENT_RENEW_BEFORE_DAYS,
  });

  const healthcheckClient = await ensureClientCertificate({
    authority,
    commonName: "Bondery Redis healthcheck",
    label: "Redis healthcheck client",
    log: options.log,
    names: { dns: ["redis-client-healthcheck"], ip: [] },
    now: options.now,
    paths: {
      certFile: paths.healthcheckCertFile,
      keyFile: paths.healthcheckKeyFile,
    },
    renewBeforeDays: REDIS_CLIENT_RENEW_BEFORE_DAYS,
  });

  const clientCertificatesGenerated =
    apiClient.certificateGenerated || healthcheckClient.certificateGenerated;

  // Redis verifies client certificates against the CA; the API trusts the CA, not the server leaf.
  const serverCertificatePem = (await readOptional(paths.serverCertFile)) ?? "";
  await writeAtomic(paths.serverCaFile, authority.certificatePem, 0o644);
  await writeAtomic(paths.clientCaFile, authority.certificatePem, 0o644);
  await writeAtomic(paths.clientServerCertFile, serverCertificatePem, 0o644);

  if (serverReplaced || apiClient.replacedExisting || healthcheckClient.replacedExisting) {
    options.log(
      options.localDev
        ? "A running Redis keeps the old certificate. Load the new one: pnpm run start:redis"
        : "A running Redis keeps the old certificate. Load the new one: docker compose up -d --force-recreate redis api",
    );
  }

  if (options.chownToContainerUsers) {
    for (const path of [
      paths.serverDir,
      paths.aclFile,
      paths.serverCertFile,
      paths.serverKeyFile,
      paths.serverCaFile,
      paths.healthcheckCertFile,
      paths.healthcheckKeyFile,
      paths.serverPasswordFile,
    ]) {
      await chown(path, REDIS_CONTAINER_UID, REDIS_CONTAINER_UID);
    }
    for (const path of [
      paths.clientDir,
      paths.clientPasswordFile,
      paths.clientCaFile,
      paths.clientCertFile,
      paths.clientKeyFile,
      paths.clientServerCertFile,
    ]) {
      await chown(path, API_CONTAINER_UID, API_CONTAINER_UID);
    }
  }

  await chmod(paths.caDir, privateDirMode);
  await chmod(paths.serverDir, privateDirMode);
  await chmod(paths.clientDir, privateDirMode);
  if (options.localDev) {
    await chmod(paths.serverKeyFile, 0o644);
    await chmod(paths.healthcheckKeyFile, 0o644);
    await chmod(paths.aclFile, 0o644);
    await chmod(paths.serverPasswordFile, 0o644);
    await chmod(paths.clientKeyFile, clientSecretMode);
    await chmod(paths.clientPasswordFile, clientSecretMode);
    await chmod(paths.caKeyFile, clientSecretMode);
  } else {
    await chmod(paths.serverKeyFile, 0o600);
    await chmod(paths.healthcheckKeyFile, 0o600);
    await chmod(paths.clientKeyFile, 0o600);
    await chmod(paths.clientPasswordFile, 0o600);
  }

  return {
    authorityGenerated,
    clientCertificatesGenerated,
    passwordGenerated,
    serverCertificateGenerated,
  };
}
