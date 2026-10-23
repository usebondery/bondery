import { isApiError } from "@bondery/helpers/api";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SyncMutation, SyncPushResponse, SyncTableKey } from "@bondery/schemas/sync";
import { mobileFetch } from "../../api/transport";
import { getAccessToken } from "../../auth/client";
import { endLocalSession, logLocalSessionMissing } from "../../auth/session";
import { API_URL } from "../../config";
import { syncRequestHeaders } from "../constants";
import { getSyncMutationTables } from "../mutation-tables";
import { applyPushResultToLocal } from "../mutations/apply-push-result";
import { notifySyncSubscribers, pullOnce } from "../pull-manager";
import { type PullSessionGeneration, syncSessionGuard } from "../pull-session-guard";
import { sanitizePushMutation } from "../sanitize-push-mutation";
import { logSyncPushError, logSyncPushRequest, logSyncPushResponse } from "../sync-logger";
import {
  ensureDeviceId,
  listPendingMutations,
  markMutationApplied,
  markMutationConflict,
  markMutationRejected,
  setLastServerSequence,
} from "./pending-mutations";
import { errorFromSyncPushHttp, errorFromSyncPushRejected } from "./sync-displayed-error";

let drainScheduledGeneration: PullSessionGeneration | null = null;
let draining = false;

type SyncErrorListener = (error: unknown) => void;
const errorListeners = new Set<SyncErrorListener>();

export function subscribeSyncErrors(listener: SyncErrorListener): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

function notifySyncError(error: unknown): void {
  for (const listener of errorListeners) {
    listener(error);
  }
}

function logDisplayedSyncError(error: unknown, extra: Record<string, unknown>): void {
  if (isApiError(error)) {
    logSyncPushError(error.developerMessage, { ...extra, code: error.code });
    return;
  }

  logSyncPushError(String(error), extra);
}

async function getBearerToken(): Promise<string | null> {
  return getAccessToken();
}

async function isCurrentDrainSession(
  generation: PullSessionGeneration,
  accessToken: string,
): Promise<boolean> {
  if (!syncSessionGuard.isCurrent(generation)) {
    return false;
  }
  const currentToken = await getBearerToken();
  return syncSessionGuard.isCurrentSession(generation, accessToken, currentToken);
}

async function runDrainPendingMutations(generation: PullSessionGeneration): Promise<void> {
  if (draining) {
    return;
  }
  draining = true;

  try {
    const token = await getBearerToken();
    if (!token) {
      logLocalSessionMissing();
      return;
    }
    if (!(await isCurrentDrainSession(generation, token))) {
      return;
    }

    const deviceId = await ensureDeviceId();
    const pending = listPendingMutations();
    if (pending.length === 0) {
      return;
    }

    const mutations: SyncMutation[] = [];
    for (const mutation of pending) {
      const sanitized = sanitizePushMutation(mutation);
      if (sanitized) {
        mutations.push(sanitized);
        continue;
      }

      logSyncPushError("dropping invalid pending mutation", {
        mutationId: mutation.id,
        type: mutation.type,
      });
      markMutationRejected(
        mutation.id,
        "Invalid local sync payload (id or timestamp). Retry the change.",
      );
    }

    if (mutations.length === 0) {
      return;
    }

    logSyncPushRequest(deviceId, mutations);

    let response: Response;
    try {
      response = await mobileFetch(`${API_URL}${API_ROUTES.SYNC_PUSH}`, {
        body: JSON.stringify({ deviceId, mutations }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...syncRequestHeaders(),
        },
        method: "POST",
      });
    } catch (error) {
      if (!(await isCurrentDrainSession(generation, token))) {
        return;
      }
      logDisplayedSyncError(error, { status: "transport" });
      notifySyncError(error);
      return;
    }

    if (!(await isCurrentDrainSession(generation, token))) {
      return;
    }

    if (response.status === 401) {
      await endLocalSession({ reason: "session_expired" });
      return;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (!(await isCurrentDrainSession(generation, token))) {
        return;
      }
      const error = errorFromSyncPushHttp(response.status, text);
      logSyncPushResponse(response.status, null, text);
      logDisplayedSyncError(error, { status: response.status });
      notifySyncError(error);
      return;
    }

    const payload = (await response.json()) as SyncPushResponse;
    if (!(await isCurrentDrainSession(generation, token))) {
      return;
    }
    logSyncPushResponse(response.status, payload);
    const mutationById = new Map(pending.map((mutation) => [mutation.id, mutation]));
    const changedTables = new Set<SyncTableKey>();

    for (const result of payload.results) {
      if (result.status === "applied" || result.status === "duplicate") {
        applyPushResultToLocal(result);
        markMutationApplied(result.id);
        const mutation = mutationById.get(result.id);
        if (mutation) {
          for (const table of getSyncMutationTables(mutation.type)) {
            changedTables.add(table);
          }
        }
      } else if (result.status === "rejected") {
        markMutationRejected(result.id, result.error);
        const rejectedError = errorFromSyncPushRejected(result);
        logDisplayedSyncError(rejectedError, { mutationId: result.id, status: "rejected" });
        notifySyncError(rejectedError);
        try {
          await pullOnce(undefined, "manual", generation);
        } catch {
          // Server reconciliation will retry on next foreground pull.
        }
        if (!(await isCurrentDrainSession(generation, token))) {
          return;
        }
      } else if (result.status === "conflict") {
        applyPushResultToLocal(result);
        markMutationConflict(result.id);
        const mutation = mutationById.get(result.id);
        if (mutation) {
          for (const table of getSyncMutationTables(mutation.type)) {
            changedTables.add(table);
          }
        }
        logSyncPushError("mutation conflict", { mutationId: result.id, status: "conflict" });
      }
    }

    if (!(await isCurrentDrainSession(generation, token))) {
      return;
    }
    setLastServerSequence(payload.nextServerSequence);
    notifySyncSubscribers(Array.from(changedTables));
  } finally {
    draining = false;
  }
}

export function drainPendingMutations(
  generation: PullSessionGeneration | null = syncSessionGuard.capture(),
): Promise<void> {
  return syncSessionGuard.runIfCurrent(generation, runDrainPendingMutations) ?? Promise.resolve();
}

export function scheduleSyncDrain(): void {
  const generation = syncSessionGuard.capture();
  if (generation === null || drainScheduledGeneration === generation) {
    return;
  }
  drainScheduledGeneration = generation;

  queueMicrotask(() => {
    if (drainScheduledGeneration === generation) {
      drainScheduledGeneration = null;
    }
    void drainPendingMutations(generation);
  });
}

export async function pushSync(): Promise<void> {
  await drainPendingMutations();
}
