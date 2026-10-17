import * as Network from "expo-network";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { readLocalAccessToken, subscribeLocalSessionEnded } from "../auth/session";
import { useAuth } from "../auth/useAuth";
import {
  registerSyncBackgroundTask,
  unregisterSyncBackgroundTask,
} from "./background/sync-background-task";
import { getSyncDatabase } from "./db";
import { countConflictMutations, countPendingMutations } from "./outbox/pending-mutations";
import { scheduleSyncDrain } from "./outbox/sync-worker";
import {
  getHasInitialSyncSnapshot,
  schedulePull,
  startPullSync,
  stopPullSync,
  subscribeSyncUpdates,
} from "./pull-manager";
import { resetLocalSyncState } from "./reset-local-sync-state";
import { decideSyncSessionLifecycle } from "./sync-session-lifecycle";
import { startSyncWakeClient, stopSyncWakeClient } from "./sync-wake-client";

type SyncContextValue = {
  isReady: boolean;
  isInitialSync: boolean;
  pendingCount: number;
  conflictCount: number;
};

const SyncContext = createContext<SyncContextValue>({
  conflictCount: 0,
  isInitialSync: true,
  isReady: false,
  pendingCount: 0,
});

export function useSync(): SyncContextValue {
  return useContext(SyncContext);
}

type SyncProviderProps = {
  children: ReactNode;
};

export function SyncProvider({ children }: SyncProviderProps) {
  const { isAuthenticated, isSessionHydrating, session } = useAuth();
  const userId = session?.user?.id ?? null;
  const previousUserIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  const refreshCounts = useCallback(() => {
    setPendingCount(countPendingMutations());
    setConflictCount(countConflictMutations());
    setIsInitialSync(!getHasInitialSyncSnapshot() && countContactsLocal() === 0);
  }, []);

  const clearReadyState = useCallback(() => {
    previousUserIdRef.current = null;
    setIsReady(false);
    setIsInitialSync(true);
    setPendingCount(0);
    setConflictCount(0);
  }, []);

  useEffect(() => {
    return subscribeLocalSessionEnded(() => {
      void (async () => {
        await unregisterSyncBackgroundTask();
        stopSyncWakeClient();
        await resetLocalSyncState();
        clearReadyState();
      })();
    });
  }, [clearReadyState]);

  useEffect(() => {
    let active = true;
    let wakeClient: Awaited<ReturnType<typeof startSyncWakeClient>> | null = null;
    let unsubscribeUpdates: (() => void) | null = null;
    let networkSub: { remove: () => void } | null = null;
    let appStateSub: { remove: () => void } | null = null;

    const tearDownRuntime = () => {
      unsubscribeUpdates?.();
      unsubscribeUpdates = null;
      networkSub?.remove();
      networkSub = null;
      appStateSub?.remove();
      appStateSub = null;
      wakeClient?.stop();
      wakeClient = null;
      stopSyncWakeClient();
      // Effect cleanup cannot await. stopPullSync invalidates the session before its first await,
      // and the next startPullSync call awaits the same teardown.
      void stopPullSync();
    };

    void (async () => {
      if (isSessionHydrating) {
        return;
      }

      const token = await readLocalAccessToken();
      if (!active) {
        return;
      }

      const action = decideSyncSessionLifecycle({
        hasLocalToken: token !== null,
        isAuthenticated,
        isSessionHydrating: false,
        nextUserId: userId,
        previousUserId: previousUserIdRef.current,
      });

      if (action === "idle") {
        return;
      }

      if (action === "wipe_logout") {
        await unregisterSyncBackgroundTask();
        if (!active) {
          return;
        }
        stopSyncWakeClient();
        await resetLocalSyncState();
        clearReadyState();
        return;
      }

      if (action === "wipe_user_switch") {
        clearReadyState();
        await resetLocalSyncState();
        if (!active) {
          return;
        }
      }

      if (!userId) {
        return;
      }

      previousUserIdRef.current = userId;

      getSyncDatabase();
      await registerSyncBackgroundTask();
      if (!active) {
        return;
      }
      await startPullSync();
      if (!active) {
        return;
      }
      wakeClient = await startSyncWakeClient();
      scheduleSyncDrain();

      if (!active) {
        wakeClient?.stop();
        wakeClient = null;
        return;
      }

      setIsReady(true);
      refreshCounts();

      unsubscribeUpdates = subscribeSyncUpdates(() => {
        refreshCounts();
        if (getHasInitialSyncSnapshot()) {
          setIsInitialSync(false);
        }
      });

      networkSub = Network.addNetworkStateListener((state) => {
        if (state.isConnected) {
          scheduleSyncDrain();
        }
      });

      appStateSub = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") {
          void schedulePull({ reason: "foreground" });
          scheduleSyncDrain();
          if (!wakeClient) {
            void startSyncWakeClient().then((client) => {
              if (!active) {
                client.stop();
                return;
              }
              wakeClient = client;
            });
          }
        }
      });
    })();

    return () => {
      active = false;
      tearDownRuntime();
    };
  }, [clearReadyState, isAuthenticated, isSessionHydrating, refreshCounts, userId]);

  return (
    <SyncContext.Provider
      value={{
        conflictCount,
        isInitialSync,
        isReady,
        pendingCount,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

function countContactsLocal(): number {
  try {
    const db = getSyncDatabase();
    const row = db.getFirstSync<{ count: number }>(
      "SELECT COUNT(*) as count FROM people WHERE myself = 0",
    );
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}
