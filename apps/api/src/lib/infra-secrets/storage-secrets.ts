/**
 * Creates the TLS material that protects the bundled SeaweedFS object storage.
 *
 * The `stack-secrets` one-shot Compose service runs this before SeaweedFS starts. Each directory
 * is its own volume, so every container mounts only what it needs:
 *
 * - `ca/` (this job only): `ca.key`, `ca.crt`. A private CA that signs the cluster certificate.
 * - `cluster/` (this job and the four SeaweedFS services): `tls.key`, `tls.crt`, `ca.crt`. One
 *   certificate for every node. It is valid for server and client authentication, so the nodes
 *   authenticate each other (mutual TLS) on gRPC and on the HTTP data path. The SeaweedFS
 *   entrypoint wrapper copies the files into a tmpfs owned by the `seaweed` user.
 * - `client/` (this job and `api`): `ca.crt`, what the API trusts for the S3 gateway.
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

/** Compose service names. SeaweedFS nodes address each other by these names. */
const SEAWEEDFS_NODES = [
  "seaweedfs-master",
  "seaweedfs-volume",
  "seaweedfs-filer",
  "seaweedfs-s3",
] as const;

export const STORAGE_CERTIFICATE_RENEW_BEFORE_DAYS = 90;

/**
 * Common name of the cluster certificate. `deploy/bondery/seaweedfs/security.toml` accepts gRPC
 * peers with this name only.
 */
export const STORAGE_CERTIFICATE_COMMON_NAME = "Bondery bundled SeaweedFS";

export type StorageSecretPaths = {
  caCertFile: string;
  caDir: string;
  caKeyFile: string;
  clientCaFile: string;
  clientDir: string;
  clusterCaFile: string;
  clusterCertFile: string;
  clusterDir: string;
  clusterKeyFile: string;
};

export function storageSecretPaths(root: string): StorageSecretPaths {
  const caDir = join(root, "ca");
  const clusterDir = join(root, "cluster");
  const clientDir = join(root, "client");
  return {
    caCertFile: join(caDir, "ca.crt"),
    caDir,
    caKeyFile: join(caDir, "ca.key"),
    clientCaFile: join(clientDir, "ca.crt"),
    clientDir,
    clusterCaFile: join(clusterDir, "ca.crt"),
    clusterCertFile: join(clusterDir, "tls.crt"),
    clusterDir,
    clusterKeyFile: join(clusterDir, "tls.key"),
  };
}

/**
 * Names the certificate must cover: every node (they call each other by Compose service name),
 * the stack alias the API connects to, and loopback for healthchecks and local development.
 */
export function storageCertificateNames(prefix: string): CertificateNames {
  const dns = new Set<string>([...SEAWEEDFS_NODES, "localhost"]);
  const trimmedPrefix = prefix.trim();
  if (trimmedPrefix) {
    dns.add(`${trimmedPrefix}-storage`);
  }
  return { dns: [...dns], ip: [LOOPBACK_IP] };
}

export type EnsureStorageSecretsOptions = {
  /** Make `client/` owned by the API container user. Needs root. */
  chownToContainerUsers: boolean;
  /**
   * Local development: the files live in a host folder that the dev SeaweedFS containers
   * bind-mount. Directories stay readable so the host user can inspect them; keys stay 0600.
   */
  localDev?: boolean;
  log: (message: string) => void;
  now?: Date;
  prefix: string;
  root: string;
};

export type EnsureStorageSecretsResult = {
  authorityGenerated: boolean;
  certificateGenerated: boolean;
};

export async function ensureStorageSecrets(
  options: EnsureStorageSecretsOptions,
): Promise<EnsureStorageSecretsResult> {
  const paths = storageSecretPaths(options.root);
  const privateDirMode = options.localDev ? 0o755 : 0o700;

  await mkdir(paths.caDir, { mode: privateDirMode, recursive: true });
  await mkdir(paths.clusterDir, { mode: privateDirMode, recursive: true });
  await mkdir(paths.clientDir, { mode: 0o755, recursive: true });

  const { authority, authorityGenerated, certificateGenerated, replacedExisting } =
    await ensureCaSignedCertificate({
      authorityCommonName: "Bondery bundled SeaweedFS CA",
      certificateCommonName: STORAGE_CERTIFICATE_COMMON_NAME,
      clientAuth: true,
      label: "SeaweedFS",
      log: options.log,
      names: storageCertificateNames(options.prefix),
      now: options.now,
      paths: {
        caCertFile: paths.caCertFile,
        caKeyFile: paths.caKeyFile,
        certFile: paths.clusterCertFile,
        keyFile: paths.clusterKeyFile,
      },
      renewBeforeDays: STORAGE_CERTIFICATE_RENEW_BEFORE_DAYS,
    });
  if (replacedExisting) {
    // A new CA (which always reissues the certificate) also needs the API restarted: the API
    // loads the CA when it creates its S3 client.
    options.log(
      options.localDev
        ? "Running SeaweedFS nodes keep the old certificate. Load the new one: pnpm run stop:seaweedfs && pnpm run start:seaweedfs"
        : "Running SeaweedFS nodes keep the old certificate. Load the new one: docker compose up -d --force-recreate traefik-transport seaweedfs-master seaweedfs-volume seaweedfs-filer seaweedfs-s3 api",
    );
  }

  // The nodes verify each other against the CA; the API verifies the S3 gateway against it.
  await writeAtomic(paths.clusterCaFile, authority.certificatePem, 0o644);
  await writeAtomic(paths.clientCaFile, authority.certificatePem, 0o644);

  if (options.chownToContainerUsers) {
    for (const path of [paths.clientDir, paths.clientCaFile]) {
      await chown(path, API_CONTAINER_UID, API_CONTAINER_UID);
    }
  }
  await chmod(paths.caDir, privateDirMode);
  await chmod(paths.clusterDir, privateDirMode);

  return { authorityGenerated, certificateGenerated };
}
