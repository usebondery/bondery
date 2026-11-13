import { prisma } from "@bondery/db";
import type { FastifyBaseLogger } from "fastify";
import { revokeEndedReviewerGrants } from "../bootstrap/revoke-expired-reviewers.js";

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
