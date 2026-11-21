import { getPrismaPool, prisma } from "@bondery/db";
import type { FastifyBaseLogger } from "fastify";
import { revokeEndedReviewerGrants } from "../bootstrap/revoke-expired-reviewers.js";
import { inspectDatabaseTls, logCertificateExpiry } from "../data/postgres-tls.js";
import {
  apiCertificateDaysLeft,
  logApiCertificateExpiry,
  resolveApiTlsConfig,
} from "../platform/api-tls.js";
import { inspectObjectStorageTls, logStorageCertificateExpiry } from "../storage/storage-tls.js";

/** Nightly enrich-queue cleanup — calls cleanup_stale_enrich_queue() in Postgres. */
export async function runEnrichQueueCleanup(log: FastifyBaseLogger): Promise<void> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT cleanup_stale_enrich_queue() AS count
  `;
  log.info({ deleted: rows[0]?.count ?? 0 }, "Enrich queue cleanup complete");
}

/** Nightly idempotency-key cleanup. Calls delete_expired_idempotency_keys(). */
export async function runIdempotencyKeyCleanup(log: FastifyBaseLogger): Promise<void> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT delete_expired_idempotency_keys() AS count
  `;
  log.info({ deleted: rows[0]?.count ?? 0 }, "Idempotency key cleanup complete");
}

/** Nightly reviewer sweep. Bans ended grants and drops their sessions and tokens. */
export async function runReviewerAccessSweep(log: FastifyBaseLogger): Promise<void> {
  await revokeEndedReviewerGrants(log);
}

async function checkPostgresCertificate(log: FastifyBaseLogger): Promise<void> {
  const pool = getPrismaPool();
  if (!pool) {
    log.warn("Postgres TLS certificate check skipped: no database pool");
    return;
  }
  const inspection = await inspectDatabaseTls(pool);
  if (!logCertificateExpiry(log, inspection.certificateDaysLeft)) {
    log.info(
      { certificateDaysLeft: inspection.certificateDaysLeft, ssl: inspection.ssl },
      "Postgres TLS certificate check complete",
    );
  }
}

async function checkObjectStorageCertificate(log: FastifyBaseLogger): Promise<void> {
  const endpoint = process.env.BONDERY_PRIVATE_S3_ENDPOINT?.trim();
  if (!endpoint) {
    log.warn("Object storage TLS certificate check skipped: no BONDERY_PRIVATE_S3_ENDPOINT");
    return;
  }
  const inspection = await inspectObjectStorageTls(endpoint);
  if (!logStorageCertificateExpiry(log, inspection.certificateDaysLeft)) {
    log.info(
      { certificateDaysLeft: inspection.certificateDaysLeft, tls: inspection.tls },
      "Object storage TLS certificate check complete",
    );
  }
}

async function checkApiCertificate(log: FastifyBaseLogger): Promise<void> {
  const certificateDaysLeft = apiCertificateDaysLeft(resolveApiTlsConfig());
  if (!logApiCertificateExpiry(log, certificateDaysLeft)) {
    log.info({ certificateDaysLeft }, "API TLS certificate check complete");
  }
}

/**
 * Daily certificate check for Postgres, object storage, and the API's HTTPS listener.
 * A stack that is not redeployed for months still warns 90 days and 14 days before a
 * certificate expires. One failed check does not skip the others.
 */
export async function runTlsCertificateCheck(log: FastifyBaseLogger): Promise<void> {
  const results = await Promise.allSettled([
    checkPostgresCertificate(log),
    checkObjectStorageCertificate(log),
    checkApiCertificate(log),
  ]);
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason);
  if (failures.length > 0) {
    throw new AggregateError(failures, "TLS certificate check failed");
  }
}
