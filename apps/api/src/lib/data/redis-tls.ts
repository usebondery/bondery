/**
 * Reports how the API's Redis connection is protected and warns before certificates expire.
 *
 * It inspects a live TLS session with the same trust and client certificate as the Redis
 * client, so it reports what the server actually presented. Nothing here fails a request or
 * the boot: it only logs.
 */

import { readFileSync } from "node:fs";
import { connect } from "node:tls";

import type { FastifyBaseLogger } from "fastify";

import { certificateDaysLeft, DAY_MS } from "../infra-secrets/x509.js";
import { logExpiringCertificate } from "../platform/certificate-expiry.js";
import {
  describeRedisSecurity,
  REDIS_TLS_CERT_FILE_ENV,
  type RedisConnectionEnv,
  resolveRedisConnectionOptions,
} from "./redis-connection-options.js";

const HANDSHAKE_TIMEOUT_MS = 5000;
const REDIS_TLS_PORT = 6379;

function parseRedisUrl(redisUrl: string): URL {
  return new URL(redisUrl);
}

export type RedisTlsInspection = {
  /** Days until the presented server certificate expires; null without TLS. */
  certificateDaysLeft: number | null;
  mutualTls: boolean;
  tls: boolean;
  version: string | null;
};

/** Completes a TLS handshake with the Redis endpoint, verified the way ioredis verifies it. */
export async function inspectRedisTls(
  redisUrl: string,
  env: RedisConnectionEnv = process.env,
  now: Date = new Date(),
): Promise<RedisTlsInspection> {
  const posture = describeRedisSecurity(redisUrl, env);
  let url: URL;
  try {
    url = parseRedisUrl(redisUrl);
  } catch {
    return { certificateDaysLeft: null, mutualTls: posture.mutualTls, tls: false, version: null };
  }
  if (url.protocol !== "rediss:") {
    return { certificateDaysLeft: null, mutualTls: posture.mutualTls, tls: false, version: null };
  }

  const connectionOptions = resolveRedisConnectionOptions(redisUrl, env);
  const host = url.hostname;
  const port = Number(url.port || REDIS_TLS_PORT);

  return new Promise((resolve, reject) => {
    const socket = connect(
      {
        host,
        minVersion: "TLSv1.2",
        port,
        rejectUnauthorized: true,
        servername: host,
        ...connectionOptions.tls,
      },
      () => {
        const expiresAt = Date.parse(socket.getPeerCertificate().valid_to);
        const inspection: RedisTlsInspection = {
          certificateDaysLeft: Number.isNaN(expiresAt)
            ? null
            : Math.floor((expiresAt - now.getTime()) / DAY_MS),
          mutualTls: posture.mutualTls,
          tls: true,
          version: socket.getProtocol(),
        };
        socket.end();
        resolve(inspection);
      },
    );
    socket.setTimeout(HANDSHAKE_TIMEOUT_MS, () => {
      socket.destroy(new Error(`TLS handshake with ${host}:${port} timed out`));
    });
    socket.on("error", reject);
  });
}

/** Log a Redis server certificate that expires soon. Returns the level used, for tests. */
export function logRedisServerCertificateExpiry(
  log: Pick<FastifyBaseLogger, "error" | "warn">,
  daysLeft: number | null,
): "error" | "warn" | null {
  return logExpiringCertificate(
    log,
    daysLeft,
    `Redis server certificate expires soon (${daysLeft} days left). On the bundled stack, deploy (the stack-secrets job renews it), then recreate Redis and api: docker compose up -d --force-recreate stack-secrets redis api`,
  );
}

/** Log a Redis client certificate that expires soon. Returns the level used, for tests. */
export function logRedisClientCertificateExpiry(
  log: Pick<FastifyBaseLogger, "error" | "warn">,
  daysLeft: number | null,
): "error" | "warn" | null {
  return logExpiringCertificate(
    log,
    daysLeft,
    `Redis client certificate expires soon (${daysLeft} days left). On the bundled stack, deploy (the stack-secrets job renews it), then recreate api: docker compose up -d --force-recreate stack-secrets api`,
  );
}

/**
 * Boot report: one info line with the negotiated TLS session and expiry warnings. Never throws.
 */
export async function logRedisTls(
  log: FastifyBaseLogger,
  redisUrl: string,
  env: RedisConnectionEnv = process.env,
): Promise<void> {
  try {
    const inspection = await inspectRedisTls(redisUrl, env);
    log.info(
      {
        certificateDaysLeft: inspection.certificateDaysLeft,
        mutualTls: inspection.mutualTls,
        tls: inspection.tls,
        tlsVersion: inspection.version,
      },
      "Redis connection security",
    );
    logRedisServerCertificateExpiry(log, inspection.certificateDaysLeft);

    const certFile = env[REDIS_TLS_CERT_FILE_ENV]?.trim();
    if (certFile) {
      const clientCertPem = readFileSync(certFile, "utf8");
      const clientDaysLeft = certificateDaysLeft(clientCertPem);
      logRedisClientCertificateExpiry(log, clientDaysLeft);
    }
  } catch (error) {
    log.warn({ err: error }, "Could not inspect Redis TLS");
  }
}
