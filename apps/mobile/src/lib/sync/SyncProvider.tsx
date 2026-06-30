import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";
import { useAuth } from "../auth/useAuth";
import { getSyncDatabase } from "./db";
import { resetLocalSyncState } from "./reset-local-sync-state";
import {
  startPullSync,
  stopPullSync,
  subscribeSyncUpdates,
  getHasInitialSyncSnapshot,
} from "./pull-manager";
import {
  countConflictMutations,
  countPendingMutations,
} from "./outbox/pending-mutations";
import { scheduleSyncDrain } from "./outbox/sync-worker";
import {
  registerSyncBackgroundTask,
  unregisterSyncBackgroundTask,
} from "./background/sync-background-task";

type SyncContextValue = {
  isReady: boolean;
  revision: number;
  isInitialSync: boolean;
  pendingCount: number;
  conflictCount: number;
  bumpRevision: () => void;
};

const SyncContext = createContext<SyncContextValue>({
  isReady: false,
  revision: 0,
  isInitialSync: true,
  pendingCount: 0,
  conflictCount: 0,
  bumpRevision: () => {},
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

  const refreshCounts = () => {
    setPendingCount(countPendingMutations());
    setConflictCount(countConflictMutations());
    setIsInitialSync(!getHasInitialSyncSnapshot() && countContactsLocal() === 0);
  };

  const bumpRevision = () => setRevision((value) => value + 1);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      void unregisterSyncBackgroundTask();
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

    void (async () => {
      getSyncDatabase();
      await registerSyncBackgroundTask();
      await startPullSync();
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
        void startPullSync();
        scheduleSyncDrain();
      }
    });

    return () => {
      active = false;
      unsubscribe();
      networkSub.remove();
      appStateSub.remove();
      void stopPullSync();
    };
  }, [isAuthenticated, userId]);

  return (
    <SyncContext.Provider
      value={{
        isReady,
        revision,
        isInitialSync,
        pendingCount,
        conflictCount,
        bumpRevision,
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
