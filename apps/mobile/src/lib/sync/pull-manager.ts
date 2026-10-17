import { buildApiErrorFromResponse } from "@bondery/helpers/api";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SyncBootstrapResponse, SyncPullResponse, SyncTableKey } from "@bondery/schemas/sync";
import { mobileFetch } from "../api/transport";
import { getAccessToken } from "../auth/client";
import {
  AuthRequiredError,
  classifyTransportFailure,
  endLocalSession,
  logLocalSessionMissing,
} from "../auth/session";
import { API_URL } from "../config";
import { flushAvatarFileJobs } from "./avatar-files";
import { syncRequestHeaders } from "./constants";
import { getSyncDatabase } from "./db";
import { applyBootstrapTables, applySyncBatches } from "./materializer";
import {
  getBootstrapCompleted,
  getLastServerSequence,
  setBootstrapCompleted,
  setLastServerSequence,
} from "./outbox/pending-mutations";
import {
  decidePullLoopFailure,
  type PullLoopFailureAction,
  shouldEnterPullLoopAfterBootstrap,
} from "./pull-auth";
import { type PullSessionGeneration, syncSessionGuard } from "./pull-session-guard";
import { shouldSchedulePullOnWake } from "./pull-wake";
import { refreshSqliteViews } from "./refresh-sqlite-views";
import { logSyncPullError, logSyncPullResponse } from "./sync-logger";

type SyncSubscriber = (tables: readonly SyncTableKey[]) => void;
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
let pullLoopPromise: Promise<void> | null = null;
let pullMode: SyncPullMode = "long_poll";
let safetyTimer: ReturnType<typeof setInterval> | null = null;

let pullInFlight: Promise<boolean> | null = null;
let pullPending = false;
let wakeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lifecycleRequest = 0;

export function subscribeSyncUpdates(listener: SyncSubscriber): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function notifySyncSubscribers(tables: readonly SyncTableKey[]): void {
  refreshSqliteViews(tables);
  for (const listener of subscribers) {
    listener(tables);
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
  if (pullMode === mode) {
    return;
  }
  pullMode = mode;

  if (mode === "websocket_wake") {
    startSafetyTimer();
  } else {
    stopSafetyTimer();
    if (pullAbort && !pullAbort.signal.aborted && !pullLoopPromise) {
      startPullLoop();
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
      lastServerSequence: getLastServerSequence(),
      myDeviceId: input.myDeviceId,
      serverSequence: input.serverSequence,
      sourceDeviceId: input.sourceDeviceId,
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
  const generation = syncSessionGuard.capture();
  if (generation === null) {
    return Promise.resolve(false);
  }

  if (pullInFlight) {
    pullPending = true;
    return pullInFlight;
  }

  pullInFlight = pullOnce(pullAbort?.signal, input.reason, generation).finally(() => {
    pullInFlight = null;
    if (pullPending && syncSessionGuard.isCurrent(generation)) {
      pullPending = false;
      void schedulePull({ reason: input.reason });
    }
  });

  return pullInFlight;
}

async function getSyncAccessToken(): Promise<string | null> {
  return getAccessToken();
}

async function delay(ms: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      resolve();
    }, ms);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

type PullSession = {
  accessToken: string;
  generation: PullSessionGeneration;
};

async function isCurrentPullSession(session: PullSession): Promise<boolean> {
  if (!syncSessionGuard.isCurrent(session.generation)) {
    return false;
  }
  const accessToken = await getSyncAccessToken();
  return syncSessionGuard.isCurrentSession(session.generation, session.accessToken, accessToken);
}

async function syncFetch<T>(
  path: string,
  generation: PullSessionGeneration,
  signal?: AbortSignal,
): Promise<{ payload: T; session: PullSession } | null> {
  const token = await getSyncAccessToken();
  if (!token) {
    throw new AuthRequiredError("missing_local_session");
  }
  const session = { accessToken: token, generation };
  if (!(await isCurrentPullSession(session))) {
    return null;
  }

  const response = await mobileFetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...syncRequestHeaders(),
    },
    signal,
  });

  if (!(await isCurrentPullSession(session))) {
    return null;
  }

  if (response.status === 401) {
    await endLocalSession({ reason: "session_expired" });
    throw new AuthRequiredError("session_revoked");
  }

  if (!response.ok) {
    const text = await response.text();
    throw buildApiErrorFromResponse({
      bodyText: text,
      status: response.status,
    });
  }

  return {
    payload: (await response.json()) as T,
    session,
  };
}

async function runBootstrapSync(
  signal: AbortSignal | undefined,
  generation: PullSessionGeneration,
): Promise<boolean> {
  const response = await syncFetch<SyncBootstrapResponse>(
    API_ROUTES.SYNC_BOOTSTRAP,
    generation,
    signal,
  );
  if (!response || !(await isCurrentPullSession(response.session))) {
    return false;
  }
  const { payload } = response;
  getSyncDatabase();
  const result = applyBootstrapTables(payload.tables);
  setLastServerSequence(payload.nextServerSequence);
  setBootstrapCompleted(true);
  notifySyncSubscribers(result.tables);
  const filesChanged = await flushAvatarFileJobs();
  if (!(await isCurrentPullSession(response.session))) {
    return false;
  }
  if (filesChanged) {
    notifySyncSubscribers(["people"]);
  }
  return true;
}

export function bootstrapSync(
  signal?: AbortSignal,
  generation: PullSessionGeneration | null = syncSessionGuard.capture(),
): Promise<boolean> {
  return (
    syncSessionGuard.runIfCurrent(generation, (activeGeneration) =>
      runBootstrapSync(signal, activeGeneration),
    ) ?? Promise.resolve(false)
  );
}

async function runPullOnce(
  signal: AbortSignal | undefined,
  reason: SyncPullReason,
  generation: PullSessionGeneration,
): Promise<boolean> {
  if (!getHasInitialSyncSnapshot()) {
    return bootstrapSync(signal, generation);
  }

  const since = getLastServerSequence();
  const waitMs = pullMode === "long_poll" ? LONG_POLL_WAIT_MS : 0;

  const query = new URLSearchParams({
    limit: "100",
    since: String(since),
    waitMs: String(waitMs),
  });

  const response = await syncFetch<SyncPullResponse>(
    `${API_ROUTES.SYNC_PULL}?${query.toString()}`,
    generation,
    signal,
  );
  if (!response || !(await isCurrentPullSession(response.session))) {
    return false;
  }
  const { payload } = response;

  logSyncPullResponse(payload.batches.length, payload.nextServerSequence, reason);

  if (payload.requiresBootstrap) {
    return bootstrapSync(signal, generation);
  }

  if (payload.batches.length === 0) {
    if (payload.nextServerSequence > since) {
      setLastServerSequence(payload.nextServerSequence);
    }
    return false;
  }

  getSyncDatabase();
  const result = applySyncBatches(payload.batches);
  setLastServerSequence(payload.nextServerSequence);
  setBootstrapCompleted(true);
  notifySyncSubscribers(result.tables);
  const filesChanged = await flushAvatarFileJobs();
  if (!(await isCurrentPullSession(response.session))) {
    return false;
  }
  if (filesChanged) {
    notifySyncSubscribers(["people"]);
  }
  return true;
}

export function pullOnce(
  signal?: AbortSignal,
  reason: SyncPullReason = "manual",
  generation: PullSessionGeneration | null = syncSessionGuard.capture(),
): Promise<boolean> {
  return (
    syncSessionGuard.runIfCurrent(generation, (activeGeneration) =>
      runPullOnce(signal, reason, activeGeneration),
    ) ?? Promise.resolve(false)
  );
}

async function pullLoop(
  controller: AbortController,
  generation: PullSessionGeneration,
): Promise<void> {
  const signal = controller.signal;

  while (!signal.aborted && syncSessionGuard.isCurrent(generation) && pullMode === "long_poll") {
    try {
      await pullOnce(signal, "long_poll", generation);
    } catch (error) {
      if (signal.aborted || !syncSessionGuard.isCurrent(generation)) {
        break;
      }

      const action = decidePullLoopFailure(error);
      if (action === "sign_out") {
        await endLocalSession({ reason: "session_expired" });
        break;
      }

      if (action === "stop") {
        if (classifyTransportFailure(error) === "missing_local_session") {
          logLocalSessionMissing();
        }
        break;
      }

      logSyncPullError(error);
      await delay(5_000, signal);
    }
  }
}

function startPullLoop(
  generation: PullSessionGeneration | null = syncSessionGuard.capture(),
): void {
  if (pullLoopPromise) {
    return;
  }
  const controller = pullAbort;
  if (!controller || !syncSessionGuard.isCurrent(generation)) {
    return;
  }
  const operation = pullLoop(controller, generation).finally(() => {
    if (pullLoopPromise === operation) {
      pullLoopPromise = null;
    }
  });
  pullLoopPromise = operation;
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
  const request = ++lifecycleRequest;
  await stopPullRuntime();
  if (request !== lifecycleRequest) {
    return;
  }

  pullAbort = new AbortController();
  const signal = pullAbort.signal;
  const generation = syncSessionGuard.activate();
  getSyncDatabase();

  let bootstrapFailure: PullLoopFailureAction | null = null;

  if (!getHasInitialSyncSnapshot()) {
    try {
      await bootstrapSync(signal, generation);
    } catch (error) {
      if (signal.aborted || !syncSessionGuard.isCurrent(generation)) {
        return;
      }

      bootstrapFailure = decidePullLoopFailure(error);
      if (bootstrapFailure === "sign_out") {
        await endLocalSession({ reason: "session_expired" });
      } else if (bootstrapFailure === "stop") {
        if (classifyTransportFailure(error) === "missing_local_session") {
          logLocalSessionMissing();
        }
      } else {
        logSyncPullError(error);
      }
    }
  }

  if (
    signal.aborted ||
    !syncSessionGuard.isCurrent(generation) ||
    !shouldEnterPullLoopAfterBootstrap(bootstrapFailure)
  ) {
    return;
  }

  if (pullMode === "long_poll") {
    startPullLoop(generation);
  } else {
    startSafetyTimer();
  }
}

export async function stopPullSync(): Promise<void> {
  lifecycleRequest += 1;
  await stopPullRuntime();
}

async function stopPullRuntime(): Promise<void> {
  const controller = pullAbort;
  const inFlight = pullInFlight;
  const loop = pullLoopPromise;
  pullPending = false;
  const trackedOperations = syncSessionGuard.deactivateAndWait();
  controller?.abort();
  stopSafetyTimer();
  if (wakeDebounceTimer) {
    clearTimeout(wakeDebounceTimer);
    wakeDebounceTimer = null;
  }

  await Promise.allSettled([
    trackedOperations,
    ...(inFlight ? [inFlight] : []),
    ...(loop ? [loop] : []),
  ]);

  if (pullAbort === controller) {
    pullAbort = null;
  }
}

export function resumePullSync(): void {
  void startPullSync();
}

export const startAllShapeSync = startPullSync;
export const stopAllShapeSync = stopPullSync;
export const resumeAllShapeSync = resumePullSync;
