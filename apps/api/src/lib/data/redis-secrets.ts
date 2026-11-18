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
import { chmod, chown, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import * as x509 from "@peculiar/x509";

/** `redis` user in the official `redis` image. */
export const REDIS_CONTAINER_UID = 999;
/** `nodejs` user in `apps/api/Dockerfile`. */
export const API_CONTAINER_UID = 1001;

const CERT_VALIDITY_DAYS = 3650;
const CERT_RENEW_BEFORE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const ECDSA_KEY: EcKeyGenParams = { name: "ECDSA", namedCurve: "P-256" };
const ECDSA_SIGNING: EcdsaParams = { hash: "SHA-256", name: "ECDSA" };

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
  return randomBytes(32).toString("base64url");
}

function toPem(label: string, der: ArrayBuffer): string {
  const base64 = Buffer.from(der).toString("base64");
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

export type RedisCertificate = {
  certificatePem: string;
  privateKeyPem: string;
};

/** Self-signed ECDSA P-256 certificate. The API pins it as its only trusted CA for Redis. */
export async function generateRedisCertificate(
  hostnames: string[],
  now: Date = new Date(),
): Promise<RedisCertificate> {
  x509.cryptoProvider.set(globalThis.crypto);
  const keys = await globalThis.crypto.subtle.generateKey(ECDSA_KEY, true, ["sign", "verify"]);
  const certificate = await x509.X509CertificateGenerator.createSelfSigned({
    extensions: [
      new x509.BasicConstraintsExtension(true, undefined, true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyCertSign,
        true,
      ),
      new x509.ExtendedKeyUsageExtension([x509.ExtendedKeyUsage.serverAuth]),
      new x509.SubjectAlternativeNameExtension([
        ...hostnames.map((value) => ({ type: "dns" as const, value })),
        { type: "ip" as const, value: "127.0.0.1" },
      ]),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),
    ],
    keys,
    name: "CN=Bondery bundled Redis",
    notAfter: new Date(now.getTime() + CERT_VALIDITY_DAYS * DAY_MS),
    notBefore: new Date(now.getTime() - DAY_MS),
    serialNumber: randomBytes(16)
      .toString("hex")
      .replace(/^[89a-f]/, "1"),
    signingAlgorithm: ECDSA_SIGNING,
  });
  const privateKey = await globalThis.crypto.subtle.exportKey("pkcs8", keys.privateKey);
  return {
    certificatePem: certificate.toString("pem"),
    privateKeyPem: toPem("PRIVATE KEY", privateKey),
  };
}

/** Why an existing certificate must be replaced, or null when it is still good. */
export function certificateReplacementReason(
  certificatePem: string,
  hostnames: string[],
  now: Date = new Date(),
): string | null {
  let certificate: x509.X509Certificate;
  try {
    certificate = new x509.X509Certificate(certificatePem);
  } catch {
    return "certificate cannot be parsed";
  }
  if (certificate.notAfter.getTime() - now.getTime() < CERT_RENEW_BEFORE_DAYS * DAY_MS) {
    return "certificate expires soon";
  }
  const san = certificate.getExtension(x509.SubjectAlternativeNameExtension);
  const covered = new Set(
    (san?.names.items ?? []).filter((name) => name.type === "dns").map((name) => name.value),
  );
  const missing = hostnames.filter((hostname) => !covered.has(hostname));
  if (missing.length > 0) {
    return `certificate does not cover ${missing.join(", ")}`;
  }
  return null;
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/** Write via a temporary file and rename, so a crash never leaves a half-written secret. */
async function writeAtomic(path: string, contents: string, mode: number): Promise<void> {
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, contents, { mode });
  await chmod(temporaryPath, mode);
  await rename(temporaryPath, path);
}

export type EnsureRedisSecretsOptions = {
  /** Change ownership to the Redis and API container users. Needs root. */
  chownToContainerUsers: boolean;
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

  await mkdir(paths.serverDir, { mode: 0o700, recursive: true });
  await mkdir(paths.clientDir, { mode: 0o700, recursive: true });

  const existingPassword = (await readOptional(paths.passwordFile))?.trim();
  const password = existingPassword || generateRedisPassword();
  const passwordGenerated = !existingPassword;
  if (passwordGenerated) {
    await writeAtomic(paths.passwordFile, `${password}\n`, 0o600);
    options.log("Generated a new Redis password");
  }
  await writeAtomic(paths.aclFile, buildRedisAclFile(password), 0o600);

  const existingCertificate = await readOptional(paths.serverCertFile);
  const existingKey = await readOptional(paths.serverKeyFile);
  const replacementReason =
    existingCertificate && existingKey
      ? certificateReplacementReason(existingCertificate, hostnames, options.now)
      : "certificate is missing";
  const certificateGenerated = replacementReason !== null;
  if (certificateGenerated) {
    const certificate = await generateRedisCertificate(hostnames, options.now);
    await writeAtomic(paths.serverKeyFile, certificate.privateKeyPem, 0o600);
    await writeAtomic(paths.serverCertFile, certificate.certificatePem, 0o644);
    options.log(
      `Generated a new Redis TLS certificate (${replacementReason}) for ${hostnames.join(", ")}`,
    );
    if (existingCertificate) {
      options.log(
        "A running Redis keeps the old certificate. Load the new one: docker compose up -d --force-recreate redis api",
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
  await chmod(paths.serverDir, 0o700);
  await chmod(paths.clientDir, 0o700);

  return { certificateGenerated, passwordGenerated };
}
