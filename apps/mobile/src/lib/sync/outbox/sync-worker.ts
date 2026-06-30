import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SyncPushResponse, SyncMutation } from "@bondery/schemas/sync";
import { API_URL } from "../../config";
import { supabase } from "../../supabase/client";
import { syncRequestHeaders } from "../constants";
import { applyPushResultToLocal } from "../mutations/apply-push-result";
import {
  ensureDeviceId,
  listPendingMutations,
  markMutationApplied,
  markMutationConflict,
  markMutationRejected,
  setLastServerSequence,
} from "./pending-mutations";
import { notifySyncSubscribers, pullOnce } from "../pull-manager";
import {
  logSyncPushError,
  logSyncPushRequest,
  logSyncPushResponse,
} from "../sync-logger";
import { sanitizePushMutation } from "../sanitize-push-mutation";

let drainScheduled = false;
let draining = false;

type SyncErrorListener = (message: string) => void;
const errorListeners = new Set<SyncErrorListener>();

export function subscribeSyncErrors(listener: SyncErrorListener): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

function notifySyncError(message: string): void {
  for (const listener of errorListeners) {
    listener(message);
  }
}

async function getBearerToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function drainPendingMutations(): Promise<void> {
  if (draining) return;
  draining = true;

  try {
    const token = await getBearerToken();
    if (!token) return;

    const deviceId = await ensureDeviceId();
    const pending = listPendingMutations();
    if (pending.length === 0) return;

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

    if (mutations.length === 0) return;

    logSyncPushRequest(deviceId, mutations);

    const response = await fetch(`${API_URL}${API_ROUTES.SYNC_PUSH}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...syncRequestHeaders(),
      },
      body: JSON.stringify({ deviceId, mutations }),
    });

    if (response.status === 426) {
      const message =
        "This app version is out of date. Please update Bondery to continue syncing.";
      logSyncPushError(message, { status: 426 });
      notifySyncError(message);
      return;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const message = text || `Sync failed (${response.status})`;
      logSyncPushResponse(response.status, null, text);
      logSyncPushError(message, { status: response.status });
      notifySyncError(message);
      return;
    }

    const payload = (await response.json()) as SyncPushResponse;
    logSyncPushResponse(response.status, payload);

    for (const result of payload.results) {
      if (result.status === "applied" || result.status === "duplicate") {
        applyPushResultToLocal(result);
        markMutationApplied(result.id);
      } else if (result.status === "rejected") {
        markMutationRejected(result.id, result.error);
        logSyncPushError(result.error, { mutationId: result.id, status: "rejected" });
        notifySyncError(result.error);
        try {
          await pullOnce();
        } catch {
          // Server reconciliation will retry on next foreground pull.
        }
      } else if (result.status === "conflict") {
        applyPushResultToLocal(result);
        markMutationConflict(result.id);
        logSyncPushError("mutation conflict", { mutationId: result.id, status: "conflict" });
      }
    }

    setLastServerSequence(payload.nextServerSequence);
    notifySyncSubscribers();
  } finally {
    draining = false;
  }
}

export function scheduleSyncDrain(): void {
  if (drainScheduled) return;
  drainScheduled = true;

  queueMicrotask(() => {
    drainScheduled = false;
    void drainPendingMutations();
  });
}

export async function pushSync(): Promise<void> {
  await drainPendingMutations();
}
