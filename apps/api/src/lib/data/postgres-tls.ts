/**
 * Reports how the API's Postgres connections are protected (see
 * docs/deploy/configuration.mdx#postgres-tls), and warns before the server certificate expires.
 *
 * It inspects a live pooled connection, so it reports what the server actually negotiated and
 * the certificate it actually presented. That works the same for the bundled Postgres and an
 * external database. Nothing here ever fails a request or the boot: it only logs.
 */

import type { DatabaseTlsDescription } from "@bondery/db";
import { describeDatabaseTls } from "@bondery/db";
import type { FastifyBaseLogger } from "fastify";
import type { Pool, PoolClient } from "pg";

import {
  CERTIFICATE_ERROR_DAYS,
  CERTIFICATE_WARN_DAYS,
  logExpiringCertificate,
} from "../platform/certificate-expiry.js";

const DAY_MS = 24 * 60 * 60 * 1000;

type DatabaseTlsInspection = {
  /** Days until the presented server certificate expires; null without TLS or a readable certificate. */
  certificateDaysLeft: number | null;
  cipher: string | null;
  ssl: boolean;
  version: string | null;
};

type TlsStream = {
  getPeerCertificate?: () => { valid_to?: string } | Record<string, never>;
};

function peerCertificateDaysLeft(client: PoolClient, now: Date): number | null {
  const stream = (client as unknown as { connection?: { stream?: TlsStream } }).connection?.stream;
  const validTo = stream?.getPeerCertificate?.()?.valid_to;
  if (!validTo) {
    return null;
  }
  const expiresAt = Date.parse(validTo);
  return Number.isNaN(expiresAt) ? null : Math.floor((expiresAt - now.getTime()) / DAY_MS);
}

export type { DatabaseTlsInspection };
export const POSTGRES_CERT_WARN_DAYS = CERTIFICATE_WARN_DAYS;
export const POSTGRES_CERT_ERROR_DAYS = CERTIFICATE_ERROR_DAYS;

export async function inspectDatabaseTls(
  pool: Pool,
  now: Date = new Date(),
): Promise<DatabaseTlsInspection> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      cipher: string | null;
      ssl: boolean;
      version: string | null;
    }>("select ssl, version, cipher from pg_stat_ssl where pid = pg_backend_pid()");
    const row = rows[0];
    return {
      certificateDaysLeft: row?.ssl ? peerCertificateDaysLeft(client, now) : null,
      cipher: row?.cipher ?? null,
      ssl: Boolean(row?.ssl),
      version: row?.version ?? null,
    };
  } finally {
    client.release();
  }
}

/** Log a certificate that expires soon. Returns the level used, for tests. */
export function logCertificateExpiry(
  log: Pick<FastifyBaseLogger, "error" | "warn">,
  daysLeft: number | null,
): "error" | "warn" | null {
  return logExpiringCertificate(
    log,
    daysLeft,
    `The Postgres server certificate expires in ${daysLeft} days. On the bundled stack, deploy (the stack-secrets job renews it), then recreate db and api: docker compose up -d --force-recreate stack-secrets db api. External database: renew it with your provider. See docs/deploy/secrets.mdx#postgres_tls_certificate`,
  );
}

/** Warn when a production API talks to Postgres without TLS that authenticates the server. */
export function warnOnInsecureProductionPostgres(
  log: Pick<FastifyBaseLogger, "warn">,
  description: DatabaseTlsDescription,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (nodeEnv !== "production" || description.authenticated) {
    return false;
  }
  log.warn(
    { mode: description.mode },
    description.encrypted
      ? "Postgres connection is encrypted but the server is not verified (DATABASE_SSL_MODE=require). Use verify-full. See https://docs.usebondery.com/deploy/configuration#postgres-tls"
      : "Postgres connection is not encrypted (DATABASE_SSL_MODE=disable). Use verify-full. See https://docs.usebondery.com/deploy/configuration#postgres-tls",
  );
  return true;
}

/**
 * Boot report: one info line with the negotiated TLS session, a production warning without
 * verified TLS, and an expiry warning. Never throws.
 */
export async function reportDatabaseTls(
  log: FastifyBaseLogger,
  pool: Pool,
  databaseUrl: string,
): Promise<void> {
  try {
    const description = describeDatabaseTls(databaseUrl);
    const inspection = await inspectDatabaseTls(pool);
    log.info(
      {
        ca: description.ca,
        certificateDaysLeft: inspection.certificateDaysLeft,
        channelBinding: description.encrypted,
        cipher: inspection.cipher,
        mode: description.mode,
        ssl: inspection.ssl,
        tlsVersion: inspection.version,
      },
      "Postgres connection security",
    );
    warnOnInsecureProductionPostgres(log, description);
    logCertificateExpiry(log, inspection.certificateDaysLeft);
  } catch (error) {
    log.warn({ err: error }, "Could not inspect Postgres TLS");
  }
}
