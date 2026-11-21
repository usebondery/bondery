/**
 * Creates the TLS material for the API's HTTPS listener, its only one (see
 * lib/platform/api-tls.ts). Traefik, the webapp's server side, and the healthcheck trust the CA.
 *
 * The `stack-secrets` one-shot Compose service runs this before the API starts. Each directory
 * is its own volume, so every container mounts only what it needs:
 *
 * - `ca/` (this job only): `ca.key`, `ca.crt`. A private CA that signs the API certificate.
 * - `server/` (this job and `api`): `tls.key`, `tls.crt`, owned by the API container user,
 *   because the API image runs as that user and reads the key directly.
 * - `client/` (this job and `webapp`): `ca.crt`, what the webapp trusts for the API.
 *
 * Clients trust the CA, not the certificate, so the certificate can be reissued without any
 * client change. It is idempotent; see private-ca.ts for when the CA or certificate is replaced.
 * See docs/deploy/secrets.mdx for rotation.
 */

import { chmod, chown, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { writeAtomic } from "./files.js";
import { API_CONTAINER_UID, LOOPBACK_IP } from "./ownership.js";
import { ensureCaSignedCertificate } from "./private-ca.js";
import type { CertificateNames } from "./x509.js";

export const API_CERTIFICATE_RENEW_BEFORE_DAYS = 90;

export type ApiSecretPaths = {
  caCertFile: string;
  caDir: string;
  caKeyFile: string;
  clientCaFile: string;
  clientDir: string;
  serverCertFile: string;
  serverDir: string;
  serverKeyFile: string;
};

export function apiSecretPaths(root: string): ApiSecretPaths {
  const caDir = join(root, "ca");
  const serverDir = join(root, "server");
  const clientDir = join(root, "client");
  return {
    caCertFile: join(caDir, "ca.crt"),
    caDir,
    caKeyFile: join(caDir, "ca.key"),
    clientCaFile: join(clientDir, "ca.crt"),
    clientDir,
    serverCertFile: join(serverDir, "tls.crt"),
    serverDir,
    serverKeyFile: join(serverDir, "tls.key"),
  };
}

/**
 * Names the webapp uses to reach the API: the Compose service, the stack alias it connects to,
 * and loopback for local development.
 */
export function apiCertificateNames(prefix: string): CertificateNames {
  const dns = new Set(["api", "localhost"]);
  const trimmedPrefix = prefix.trim();
  if (trimmedPrefix) {
    dns.add(`${trimmedPrefix}-api`);
  }
  return { dns: [...dns], ip: [LOOPBACK_IP] };
}

export type EnsureApiSecretsOptions = {
  /** Make `server/` owned by the API container user. Needs root. */
  chownToContainerUsers: boolean;
  /**
   * Local development: the files live in a host folder that the dev API and webapp read.
   * Directories stay readable so the host user can inspect them; keys stay 0600.
   */
  localDev?: boolean;
  log: (message: string) => void;
  now?: Date;
  prefix: string;
  root: string;
};

export type EnsureApiSecretsResult = {
  authorityGenerated: boolean;
  certificateGenerated: boolean;
};

export async function ensureApiSecrets(
  options: EnsureApiSecretsOptions,
): Promise<EnsureApiSecretsResult> {
  const paths = apiSecretPaths(options.root);
  const privateDirMode = options.localDev ? 0o755 : 0o700;

  await mkdir(paths.caDir, { mode: privateDirMode, recursive: true });
  await mkdir(paths.serverDir, { mode: privateDirMode, recursive: true });
  await mkdir(paths.clientDir, { mode: 0o755, recursive: true });

  const { authority, authorityGenerated, certificateGenerated, replacedExisting } =
    await ensureCaSignedCertificate({
      authorityCommonName: "Bondery bundled API CA",
      certificateCommonName: "Bondery API (internal)",
      label: "API",
      log: options.log,
      names: apiCertificateNames(options.prefix),
      now: options.now,
      paths: {
        caCertFile: paths.caCertFile,
        caKeyFile: paths.caKeyFile,
        certFile: paths.serverCertFile,
        keyFile: paths.serverKeyFile,
      },
      renewBeforeDays: API_CERTIFICATE_RENEW_BEFORE_DAYS,
    });
  if (replacedExisting) {
    // A new CA (which always reissues the certificate) also needs the webapp restarted: it
    // loads the CA once at startup.
    options.log(
      options.localDev
        ? "A running API keeps the old certificate. Restart the dev API and webapp (pnpm run dev)"
        : "A running API keeps the old certificate. Load the new one: docker compose up -d --force-recreate api webapp",
    );
  }

  await writeAtomic(paths.clientCaFile, authority.certificatePem, 0o644);

  if (options.chownToContainerUsers) {
    for (const path of [paths.serverDir, paths.serverCertFile, paths.serverKeyFile]) {
      await chown(path, API_CONTAINER_UID, API_CONTAINER_UID);
    }
  }
  await chmod(paths.caDir, privateDirMode);
  await chmod(paths.serverDir, privateDirMode);

  return { authorityGenerated, certificateGenerated };
}
