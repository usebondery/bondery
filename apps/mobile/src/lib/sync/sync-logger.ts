import type { SyncMutation } from "@bondery/schemas/sync";
import { SYNC_DEBUG } from "@/lib/config";

const LOG_PREFIX = "[sync]";

/** Set BONDERY_PUBLIC_SYNC_DEBUG=1 to log every shape batch (including heartbeats). */
const VERBOSE = SYNC_DEBUG;

function summarizeMutations(mutations: SyncMutation[]) {
  return mutations.map((mutation) => ({
    clientSequence: mutation.clientSequence,
    entityId: "entityId" in mutation ? mutation.entityId : undefined,
    id: mutation.id,
    type: mutation.type,
  }));
}

function writeDevLog(level: "log" | "warn", ...args: unknown[]): void {
  // biome-ignore lint/suspicious/noConsole: centralized dev-only sync diagnostics sink
  console[level](...args);
}

export function logSyncPushRequest(deviceId: string, mutations: SyncMutation[]): void {
  if (!__DEV__) {
    return;
  }
  writeDevLog("log", LOG_PREFIX, "push request", {
    deviceId,
    mutationCount: mutations.length,
    mutations: summarizeMutations(mutations),
  });
}

export function logSyncPushResponse(status: number, payload: unknown, rawBody?: string): void {
  if (!__DEV__) {
    return;
  }
  writeDevLog("log", LOG_PREFIX, "push response", {
    payload,
    status,
    ...(rawBody && status >= 400 ? { rawBody } : {}),
  });
}

export function logSyncPushError(message: string, details?: Record<string, unknown>): void {
  writeDevLog("warn", LOG_PREFIX, "push error", { message, ...details });
}

export function logSyncPullResponse(
  batchCount: number,
  nextServerSequence: number,
  reason?: string,
): void {
  if (!__DEV__) {
    return;
  }
  if (batchCount === 0 && !VERBOSE) {
    return;
  }
  writeDevLog("log", LOG_PREFIX, "pull response", { batchCount, nextServerSequence, reason });
}

export function logSyncPullError(error: unknown): void {
  writeDevLog("warn", LOG_PREFIX, "pull error", {
    message: error instanceof Error ? error.message : String(error),
  });
}

export function logSyncMutationEnqueued(mutation: SyncMutation): void {
  if (!__DEV__) {
    return;
  }
  writeDevLog("log", LOG_PREFIX, "mutation enqueued", {
    clientSequence: mutation.clientSequence,
    id: mutation.id,
    type: mutation.type,
  });
}
