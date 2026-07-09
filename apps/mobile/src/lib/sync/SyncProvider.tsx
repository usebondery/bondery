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
import { startSyncWakeClient, stopSyncWakeClient } from "./sync-wake-client";

type SyncContextValue = {
  isReady: boolean;
  revision: number;
  isInitialSync: boolean;
  pendingCount: number;
  conflictCount: number;
  bumpRevision: () => void;
};

const SyncContext = createContext<SyncContextValue>({
  bumpRevision: () => {},
  conflictCount: 0,
  isInitialSync: true,
  isReady: false,
  pendingCount: 0,
  revision: 0,
});

export function useSync(): SyncContextValue {
  return useContext(SyncContext);
}

type SyncProviderProps = {
  children: ReactNode;
};

export function SyncProvider({ children }: SyncProviderProps) {
  const { isAuthenticated, session } = useAuth();
  const userId = session?.user?.id ?? null;
  const previousUserIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  const refreshCounts = useCallback(() => {
    setPendingCount(countPendingMutations());
    setConflictCount(countConflictMutations());
    setIsInitialSync(!getHasInitialSyncSnapshot() && countContactsLocal() === 0);
  }, []);

  const bumpRevision = () => setRevision((value) => value + 1);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      void unregisterSyncBackgroundTask();
      stopSyncWakeClient();
      resetLocalSyncState();
      previousUserIdRef.current = null;
      setIsReady(false);
      setIsInitialSync(true);
      setPendingCount(0);
      setConflictCount(0);
      setRevision((value) => value + 1);
      return;
    }

    if (previousUserIdRef.current && previousUserIdRef.current !== userId) {
      resetLocalSyncState();
      setRevision((value) => value + 1);
    }
    previousUserIdRef.current = userId;

    let active = true;

    let wakeClient: Awaited<ReturnType<typeof startSyncWakeClient>> | null = null;

    void (async () => {
      getSyncDatabase();
      await registerSyncBackgroundTask();
      await startPullSync();
      wakeClient = await startSyncWakeClient();
      scheduleSyncDrain();

      if (active) {
        setIsReady(true);
        refreshCounts();
      }
    })();

    const unsubscribe = subscribeSyncUpdates(() => {
      setRevision((value) => value + 1);
      refreshCounts();
      if (getHasInitialSyncSnapshot()) {
        setIsInitialSync(false);
      }
    });

    const networkSub = Network.addNetworkStateListener((state) => {
      if (state.isConnected) {
        scheduleSyncDrain();
      }
    });

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void schedulePull({ reason: "foreground" });
        scheduleSyncDrain();
        if (!wakeClient) {
          void startSyncWakeClient().then((client) => {
            wakeClient = client;
          });
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
      networkSub.remove();
      appStateSub.remove();
      wakeClient?.stop();
      wakeClient = null;
      stopSyncWakeClient();
      void stopPullSync();
    };
  }, [isAuthenticated, userId, refreshCounts]);

  return (
    <SyncContext.Provider
      value={{
        bumpRevision,
        conflictCount,
        isInitialSync,
        isReady,
        pendingCount,
        revision,
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
