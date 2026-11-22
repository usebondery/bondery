/**
 * Reports how the API's object storage connection is protected (see
 * docs/deploy/configuration.mdx#object-storage-tls), and warns before the certificate expires.
 *
 * Like the Postgres report, it inspects a live TLS session with the same trust settings as the
 * S3 client, so it reports what the server actually presented. That works the same for the
 * bundled SeaweedFS and an external S3. Nothing here fails a request or the boot: it only logs.
 */

import { isIP } from "node:net";
import { connect } from "node:tls";

import type { FastifyBaseLogger } from "fastify";

import { logExpiringCertificate } from "../platform/certificate-expiry.js";
import {
  describeS3Security,
  parseS3Endpoint,
  resolveS3TrustedCa,
  type S3ConnectionEnv,
} from "./s3-client.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const HANDSHAKE_TIMEOUT_MS = 5000;

export type StorageTlsInspection = {
  /** Days until the presented certificate expires; null without TLS. */
  certificateDaysLeft: number | null;
  tls: boolean;
  version: string | null;
};

/** Completes a TLS handshake with the endpoint, verified the way the S3 client verifies it. */
export async function inspectObjectStorageTls(
  endpoint: string,
  env: S3ConnectionEnv = process.env,
  now: Date = new Date(),
): Promise<StorageTlsInspection> {
  const url = parseS3Endpoint(endpoint);
  if (url.protocol !== "https:") {
    return { certificateDaysLeft: null, tls: false, version: null };
  }
  const ca = resolveS3TrustedCa(endpoint, env);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  return new Promise((resolve, reject) => {
    const socket = connect(
      {
        host,
        port: Number(url.port || 443),
        // SNI takes host names only; Node still checks an IP against the certificate.
        ...(isIP(host) ? {} : { servername: host }),
        ...(ca ? { ca } : {}),
      },
      () => {
        const expiresAt = Date.parse(socket.getPeerCertificate().valid_to);
        const inspection = {
          certificateDaysLeft: Number.isNaN(expiresAt)
            ? null
            : Math.floor((expiresAt - now.getTime()) / DAY_MS),
          tls: true,
          version: socket.getProtocol(),
        };
        socket.end();
        resolve(inspection);
      },
    );
    socket.setTimeout(HANDSHAKE_TIMEOUT_MS, () => {
      socket.destroy(new Error(`TLS handshake with ${url.host} timed out`));
    });
    socket.on("error", reject);
  });
}

/** Log an object storage certificate that expires soon. Returns the level used, for tests. */
export function logStorageCertificateExpiry(
  log: Pick<FastifyBaseLogger, "error" | "warn">,
  daysLeft: number | null,
): "error" | "warn" | null {
  return logExpiringCertificate(
    log,
    daysLeft,
    `The object storage TLS certificate expires in ${daysLeft} days. On the bundled stack, deploy (the stack-secrets job renews it), then recreate SeaweedFS: docker compose up -d --force-recreate stack-secrets seaweedfs-master seaweedfs-volume seaweedfs-filer seaweedfs-s3. External storage: renew it with your provider. See docs/deploy/secrets.mdx#storage_tls_certificate`,
  );
}

/** Warn when a production API talks to object storage without TLS. */
export function warnOnInsecureProductionStorage(
  log: Pick<FastifyBaseLogger, "warn">,
  endpoint: string,
  nodeEnv: string | undefined = process.env["NODE_ENV"],
): boolean {
  if (nodeEnv !== "production" || describeS3Security(endpoint).tls) {
    return false;
  }
  log.warn(
    "Object storage connection is not encrypted: BONDERY_PRIVATE_S3_ENDPOINT uses http://. Use https://. See https://docs.usebondery.com/deploy/configuration#object-storage-tls",
  );
  return true;
}

/**
 * Boot report: one info line with the negotiated TLS session, a production warning without
 * TLS, and an expiry warning. Never throws.
 */
export async function reportObjectStorageTls(
  log: FastifyBaseLogger,
  endpoint: string,
): Promise<void> {
  try {
    const posture = describeS3Security(endpoint);
    const inspection = await inspectObjectStorageTls(endpoint);
    log.info(
      {
        certificateDaysLeft: inspection.certificateDaysLeft,
        privateCa: posture.privateCa,
        tls: inspection.tls,
        tlsVersion: inspection.version,
      },
      "Object storage connection security",
    );
    warnOnInsecureProductionStorage(log, endpoint);
    logStorageCertificateExpiry(log, inspection.certificateDaysLeft);
  } catch (error) {
    log.warn({ err: error }, "Could not inspect object storage TLS");
  }
}
