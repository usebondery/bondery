import type { FastifyBaseLogger } from "fastify";

type SyncMetricLabels = Record<string, string | number | boolean | undefined>;

export function logSyncMetric(
  log: FastifyBaseLogger | undefined,
  event: string,
  labels: SyncMetricLabels = {},
): void {
  log?.info({ sync: event, ...labels }, `[sync] ${event}`);
}

export function logSyncPull(
  log: FastifyBaseLogger | undefined,
  input: {
    userId: string;
    since: number;
    batchCount: number;
    nextServerSequence: number;
    requiresBootstrap?: boolean;
  },
): void {
  logSyncMetric(log, "pull", input);
}

export function logSyncBootstrap(
  log: FastifyBaseLogger | undefined,
  input: { userId: string; rowCount: number; nextServerSequence: number; durationMs: number },
): void {
  logSyncMetric(log, "bootstrap", input);
}

export function logSyncChangelogEmitted(
  log: FastifyBaseLogger | undefined,
  input: { userId: string; serverSequence: number; changeCount: number },
): void {
  logSyncMetric(log, "changelog_emitted", input);
}
