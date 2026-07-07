import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SyncBootstrapResponse, SyncPullResponse } from "@bondery/schemas/sync";
import { API_URL } from "../config";
import { supabase } from "../supabase/client";
import { syncRequestHeaders } from "./constants";
import { getSyncDatabase } from "./db";
import { applyBootstrapTables, applySyncBatches } from "./materializer";
import {
  getBootstrapCompleted,
  getLastServerSequence,
  setBootstrapCompleted,
  setLastServerSequence,
} from "./outbox/pending-mutations";
import { logSyncPullError, logSyncPullResponse } from "./sync-logger";
import { shouldSchedulePullOnWake } from "./pull-wake";

type SyncSubscriber = () => void;
export type SyncPullReason =
  | "wake"
  | "reconnect"
  | "safety"
  | "foreground"
  | "background"
  | "long_poll"
  | "manual";

type SyncPullMode = "long_poll" | "websocket_wake";

const LONG_POLL_WAIT_MS = 25_000;
const SAFETY_PULL_INTERVAL_MS = 300_000;

const subscribers = new Set<SyncSubscriber>();
let pullAbort: AbortController | null = null;
let pullLoopRunning = false;
let pullMode: SyncPullMode = "long_poll";
let safetyTimer: ReturnType<typeof setInterval> | null = null;

let pullInFlight: Promise<boolean> | null = null;
let pullPending = false;
let wakeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
  try {
    return getBootstrapCompleted();
  } catch {
    return false;
  }
}

export function resetInitialSyncSnapshot(): void {
  try {
    setBootstrapCompleted(false);
  } catch {
    // Database may not be open during early logout.
  }
}

export function setSyncPullMode(mode: SyncPullMode): void {
  if (pullMode === mode) return;
  pullMode = mode;

  if (mode === "websocket_wake") {
    startSafetyTimer();
  } else {
    stopSafetyTimer();
    if (pullAbort && !pullAbort.signal.aborted && !pullLoopRunning) {
      void pullLoop();
    }
  }
}

export function onSyncWakeEvent(input: {
  serverSequence: number;
  sourceDeviceId?: string;
  myDeviceId?: string;
}): void {
  if (
    !shouldSchedulePullOnWake({
      serverSequence: input.serverSequence,
      lastServerSequence: getLastServerSequence(),
      sourceDeviceId: input.sourceDeviceId,
      myDeviceId: input.myDeviceId,
    })
  ) {
    return;
  }

  if (wakeDebounceTimer) {
    clearTimeout(wakeDebounceTimer);
  }

  wakeDebounceTimer = setTimeout(() => {
    wakeDebounceTimer = null;
    void schedulePull({ reason: "wake" });
  }, 50);
}

export function onSyncWakeReconnect(): void {
  void schedulePull({ reason: "reconnect" });
}

export function schedulePull(input: { reason: SyncPullReason }): Promise<boolean> {
  if (pullInFlight) {
    pullPending = true;
    return pullInFlight;
  }

  pullInFlight = pullOnce(pullAbort?.signal, input.reason).finally(() => {
    pullInFlight = null;
    if (pullPending) {
      pullPending = false;
      void schedulePull({ reason: input.reason });
    }
  });

  return pullInFlight;
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
  setBootstrapCompleted(true);
  notifySyncSubscribers();
}

export async function pullOnce(
  signal?: AbortSignal,
  reason: SyncPullReason = "manual",
): Promise<boolean> {
  if (!getHasInitialSyncSnapshot()) {
    await bootstrapSync(signal);
    return true;
  }

  const since = getLastServerSequence();
  const waitMs = pullMode === "long_poll" ? LONG_POLL_WAIT_MS : 0;

  const query = new URLSearchParams({
    since: String(since),
    limit: "100",
    waitMs: String(waitMs),
  });

  const payload = await syncFetch<SyncPullResponse>(
    `${API_ROUTES.SYNC_PULL}?${query.toString()}`,
    signal,
  );

  logSyncPullResponse(payload.batches.length, payload.nextServerSequence, reason);

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
  setBootstrapCompleted(true);
  notifySyncSubscribers();
  return true;
}

async function pullLoop(): Promise<void> {
  if (pullLoopRunning) return;
  pullLoopRunning = true;

  try {
    while (pullAbort && !pullAbort.signal.aborted && pullMode === "long_poll") {
      try {
        await pullOnce(pullAbort.signal, "long_poll");
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

function startSafetyTimer(): void {
  stopSafetyTimer();
  safetyTimer = setInterval(() => {
    void schedulePull({ reason: "safety" });
  }, SAFETY_PULL_INTERVAL_MS);
}

function stopSafetyTimer(): void {
  if (safetyTimer) {
    clearInterval(safetyTimer);
    safetyTimer = null;
  }
}

export async function startPullSync(): Promise<void> {
  await stopPullSync();
  pullAbort = new AbortController();
  getSyncDatabase();

  if (!getHasInitialSyncSnapshot()) {
    try {
      await bootstrapSync(pullAbort.signal);
    } catch (error) {
      logSyncPullError(error);
    }
  }

  if (pullMode === "long_poll") {
    void pullLoop();
  } else {
    startSafetyTimer();
  }
}

export async function stopPullSync(): Promise<void> {
  pullAbort?.abort();
  pullAbort = null;
  stopSafetyTimer();
  if (wakeDebounceTimer) {
    clearTimeout(wakeDebounceTimer);
    wakeDebounceTimer = null;
  }
}

export function resumePullSync(): void {
  void startPullSync();
}

export const startAllShapeSync = startPullSync;
export const stopAllShapeSync = stopPullSync;
export const resumeAllShapeSync = resumePullSync;
