/**
 * Creates the password and TLS certificate that protect the bundled Compose Redis.
 *
 * The `redis-secrets` one-shot Compose service runs this before Redis starts. It writes into
 * a shared volume:
 *
 * - `server/` (Redis user only): `tls.crt`, `tls.key`, `users.acl` (SHA-256 of the password)
 * - `client/` (API user only): `password`, `ca.crt` (the pinned Redis certificate)
 *
 * It is idempotent. Existing secrets stay. It creates only what is missing, and it replaces the
 * certificate when it expires soon or does not cover the Redis hostnames. So an existing
 * install gets protected Redis on its next `docker compose up` without operator action.
 */

import { createHash, randomBytes } from "node:crypto";
import { chmod, chown, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { readOptional, writeAtomic } from "../infra-secrets/files.js";
import { API_CONTAINER_UID, LOOPBACK_IP } from "../infra-secrets/ownership.js";
import {
  certificateCoverageReason,
  createSelfSignedServerCertificate,
} from "../infra-secrets/x509.js";

export { API_CONTAINER_UID };

/** `redis` user in the official `redis` image. */
export const REDIS_CONTAINER_UID = 999;

const CERT_VALIDITY_DAYS = 3650;
const CERT_RENEW_BEFORE_DAYS = 30;
const REDIS_PASSWORD_BYTES = 32;

export type RedisSecretPaths = {
  aclFile: string;
  caFile: string;
  clientDir: string;
  passwordFile: string;
  serverCertFile: string;
  serverDir: string;
  serverKeyFile: string;
};

export function redisSecretPaths(root: string): RedisSecretPaths {
  const serverDir = join(root, "server");
  const clientDir = join(root, "client");
  return {
    aclFile: join(serverDir, "users.acl"),
    caFile: join(clientDir, "ca.crt"),
    clientDir,
    passwordFile: join(clientDir, "password"),
    serverCertFile: join(serverDir, "tls.crt"),
    serverDir,
    serverKeyFile: join(serverDir, "tls.key"),
  };
}

/** Hostnames the API and the Redis healthcheck use to reach Redis. */
export function redisCertificateHostnames(prefix: string): string[] {
  const names = new Set(["redis", "localhost"]);
  const trimmedPrefix = prefix.trim();
  if (trimmedPrefix) {
    names.add(`${trimmedPrefix}-redis`);
  }
  return [...names];
}

/** Redis ACL line for the default user. Stores only the SHA-256 of the password. */
export function buildRedisAclFile(password: string): string {
  const digest = createHash("sha256").update(password, "utf8").digest("hex");
  return `user default on #${digest} ~* &* +@all\n`;
}

export function generateRedisPassword(): string {
  return randomBytes(REDIS_PASSWORD_BYTES).toString("base64url");
}

export type RedisCertificate = {
  certificatePem: string;
  privateKeyPem: string;
};

/** Self-signed ECDSA P-256 certificate. The API pins it as its only trusted CA for Redis. */
export function generateRedisCertificate(
  hostnames: string[],
  now: Date = new Date(),
): Promise<RedisCertificate> {
  return createSelfSignedServerCertificate({
    commonName: "Bondery bundled Redis",
    names: { dns: hostnames, ip: [LOOPBACK_IP] },
    now,
    validityDays: CERT_VALIDITY_DAYS,
  });
}

/** Why an existing certificate must be replaced, or null when it is still good. */
export function certificateReplacementReason(
  certificatePem: string,
  hostnames: string[],
  now: Date = new Date(),
): string | null {
  return certificateCoverageReason(certificatePem, {
    names: { dns: hostnames, ip: [] },
    now,
    renewBeforeDays: CERT_RENEW_BEFORE_DAYS,
  });
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
  log: (message: string) => void;
  now?: Date;
  prefix: string;
  root: string;
};

export type EnsureRedisSecretsResult = {
  certificateGenerated: boolean;
  passwordGenerated: boolean;
};

export async function ensureRedisSecrets(
  options: EnsureRedisSecretsOptions,
): Promise<EnsureRedisSecretsResult> {
  const paths = redisSecretPaths(options.root);
  const hostnames = redisCertificateHostnames(options.prefix);
  const dirMode = options.localDev ? 0o755 : 0o700;
  const secretMode = options.localDev ? 0o644 : 0o600;

  await mkdir(paths.serverDir, { mode: dirMode, recursive: true });
  await mkdir(paths.clientDir, { mode: dirMode, recursive: true });

  const existingPassword = (await readOptional(paths.passwordFile))?.trim();
  const password = existingPassword || generateRedisPassword();
  const passwordGenerated = !existingPassword;
  if (passwordGenerated) {
    await writeAtomic(paths.passwordFile, `${password}\n`, secretMode);
    options.log("Generated a new Redis password");
  }
  await writeAtomic(paths.aclFile, buildRedisAclFile(password), secretMode);

  const existingCertificate = await readOptional(paths.serverCertFile);
  const existingKey = await readOptional(paths.serverKeyFile);
  const replacementReason =
    existingCertificate && existingKey
      ? certificateReplacementReason(existingCertificate, hostnames, options.now)
      : "certificate is missing";
  const certificateGenerated = replacementReason !== null;
  if (certificateGenerated) {
    const certificate = await generateRedisCertificate(hostnames, options.now);
    await writeAtomic(paths.serverKeyFile, certificate.privateKeyPem, secretMode);
    await writeAtomic(paths.serverCertFile, certificate.certificatePem, 0o644);
    options.log(
      `Generated a new Redis TLS certificate (${replacementReason}) for ${hostnames.join(", ")}`,
    );
    if (existingCertificate) {
      options.log(
        options.localDev
          ? "A running Redis keeps the old certificate. Load the new one: pnpm run start:redis"
          : "A running Redis keeps the old certificate. Load the new one: docker compose up -d --force-recreate redis api",
      );
    }
  }
  const certificatePem = await readFile(paths.serverCertFile, "utf8");
  await writeAtomic(paths.caFile, certificatePem, 0o644);

  if (options.chownToContainerUsers) {
    for (const path of [
      paths.serverDir,
      paths.aclFile,
      paths.serverCertFile,
      paths.serverKeyFile,
    ]) {
      await chown(path, REDIS_CONTAINER_UID, REDIS_CONTAINER_UID);
    }
    for (const path of [paths.clientDir, paths.passwordFile, paths.caFile]) {
      await chown(path, API_CONTAINER_UID, API_CONTAINER_UID);
    }
  }
  await chmod(paths.serverDir, dirMode);
  await chmod(paths.clientDir, dirMode);

  return { certificateGenerated, passwordGenerated };
}
