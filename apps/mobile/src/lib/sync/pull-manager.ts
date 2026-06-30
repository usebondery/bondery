import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SyncBootstrapResponse, SyncPullResponse } from "@bondery/schemas/sync";
import { API_URL } from "../config";
import { supabase } from "../supabase/client";
import { syncRequestHeaders } from "./constants";
import { getSyncDatabase } from "./db";
import { applyBootstrapTables, applySyncBatches } from "./materializer";
import {
  getLastServerSequence,
  setLastServerSequence,
} from "./outbox/pending-mutations";
import { logSyncPullError, logSyncPullResponse } from "./sync-logger";

type SyncSubscriber = () => void;

const subscribers = new Set<SyncSubscriber>();
let pullAbort: AbortController | null = null;
let pullLoopRunning = false;
let hasCompletedBootstrap = false;

export function subscribeSyncUpdates(listener: SyncSubscriber): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function notifySyncSubscribers(): void {
  for (const listener of subscribers) {
    listener();
  }
}

export function getHasInitialSyncSnapshot(): boolean {
  return hasCompletedBootstrap;
}

export function resetInitialSyncSnapshot(): void {
  hasCompletedBootstrap = false;
}

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function syncFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...syncRequestHeaders(),
    },
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Sync request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function bootstrapSync(signal?: AbortSignal): Promise<void> {
  const payload = await syncFetch<SyncBootstrapResponse>(API_ROUTES.SYNC_BOOTSTRAP, signal);
  getSyncDatabase();
  applyBootstrapTables(payload.tables);
  setLastServerSequence(payload.nextServerSequence);
  hasCompletedBootstrap = true;
  notifySyncSubscribers();
}

export async function pullOnce(signal?: AbortSignal): Promise<boolean> {
  const since = getLastServerSequence();
  if (since === 0) {
    await bootstrapSync(signal);
    return true;
  }

  const query = new URLSearchParams({
    since: String(since),
    limit: "100",
    waitMs: "25000",
  });

  const payload = await syncFetch<SyncPullResponse>(
    `${API_ROUTES.SYNC_PULL}?${query.toString()}`,
    signal,
  );

  logSyncPullResponse(payload.batches.length, payload.nextServerSequence);

  if (payload.requiresBootstrap) {
    await bootstrapSync(signal);
    return true;
  }

  if (payload.batches.length === 0) {
    if (payload.nextServerSequence > since) {
      setLastServerSequence(payload.nextServerSequence);
    }
    return false;
  }

  getSyncDatabase();
  applySyncBatches(payload.batches);
  setLastServerSequence(payload.nextServerSequence);
  hasCompletedBootstrap = true;
  notifySyncSubscribers();
  return true;
}

async function pullLoop(): Promise<void> {
  if (pullLoopRunning) return;
  pullLoopRunning = true;

  try {
    while (pullAbort && !pullAbort.signal.aborted) {
      try {
        await pullOnce(pullAbort.signal);
      } catch (error) {
        if (pullAbort.signal.aborted) break;
        logSyncPullError(error);
        await new Promise((resolve) => setTimeout(resolve, 5_000));
      }
    }
  } finally {
    pullLoopRunning = false;
  }
}

export async function startPullSync(): Promise<void> {
  await stopPullSync();
  pullAbort = new AbortController();
  getSyncDatabase();

  if (getLastServerSequence() === 0) {
    try {
      await bootstrapSync(pullAbort.signal);
    } catch (error) {
      logSyncPullError(error);
    }
  }

  void pullLoop();
}

export async function stopPullSync(): Promise<void> {
  pullAbort?.abort();
  pullAbort = null;
}

export function resumePullSync(): void {
  void startPullSync();
}

// Legacy aliases for background task and imports
export const startAllShapeSync = startPullSync;
export const stopAllShapeSync = stopPullSync;
export const resumeAllShapeSync = resumePullSync;
