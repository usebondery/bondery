import type { SyncMutation } from "@bondery/schemas/sync";

const LOG_PREFIX = "[sync]";

/** Set EXPO_PUBLIC_SYNC_DEBUG=1 to log every shape batch (including heartbeats). */
const VERBOSE =
  process.env.EXPO_PUBLIC_SYNC_DEBUG === "1" || process.env.EXPO_PUBLIC_SYNC_DEBUG === "true";

function summarizeMutations(mutations: SyncMutation[]) {
  return mutations.map((mutation) => ({
    id: mutation.id,
    type: mutation.type,
    entityId: "entityId" in mutation ? mutation.entityId : undefined,
    clientSequence: mutation.clientSequence,
  }));
}

export function logSyncPushRequest(deviceId: string, mutations: SyncMutation[]): void {
  if (!__DEV__) return;
  console.log(LOG_PREFIX, "push request", {
    deviceId,
    mutationCount: mutations.length,
    mutations: summarizeMutations(mutations),
  });
}

export function logSyncPushResponse(
  status: number,
  payload: unknown,
  rawBody?: string,
): void {
  if (!__DEV__) return;
  console.log(LOG_PREFIX, "push response", {
    status,
    payload,
    ...(rawBody && status >= 400 ? { rawBody } : {}),
  });
}

export function logSyncPushError(message: string, details?: Record<string, unknown>): void {
  console.warn(LOG_PREFIX, "push error", { message, ...details });
}

export function logSyncPullResponse(
  batchCount: number,
  nextServerSequence: number,
  reason?: string,
): void {
  if (!__DEV__) return;
  if (batchCount === 0 && !VERBOSE) return;
  console.log(LOG_PREFIX, "pull response", { batchCount, nextServerSequence, reason });
}

export function logSyncPullError(error: unknown): void {
  console.warn(LOG_PREFIX, "pull error", {
    message: error instanceof Error ? error.message : String(error),
  });
}

export function logSyncMutationEnqueued(mutation: SyncMutation): void {
  if (!__DEV__) return;
  console.log(LOG_PREFIX, "mutation enqueued", {
    id: mutation.id,
    type: mutation.type,
    clientSequence: mutation.clientSequence,
  });
}
