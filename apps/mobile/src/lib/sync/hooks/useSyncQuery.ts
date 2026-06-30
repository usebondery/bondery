import { useCallback, useEffect, useRef, useState } from "react";
import { useSync } from "../SyncProvider";
import { getContact, getMyselfContact } from "../repositories/contacts";
import { listGroups } from "../repositories/groups";
import { listTags } from "../repositories/tags";

export function useSyncQuery<T>(queryFn: () => T, deps: unknown[] = []): {
  data: T;
  revision: number;
  isInitialSync: boolean;
  pendingCount: number;
  conflictCount: number;
  refresh: () => void;
} {
  const { revision, isInitialSync, pendingCount, conflictCount, bumpRevision } = useSync();
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const [data, setData] = useState<T>(() => queryFnRef.current());

  useEffect(() => {
    setData(queryFnRef.current());
  }, [revision, ...deps]);

  const refresh = useCallback(() => {
    setData(queryFnRef.current());
    bumpRevision();
  }, [bumpRevision]);

  return {
    data,
    revision,
    isInitialSync,
    pendingCount,
    conflictCount,
    refresh,
  };
}

export function useContact(contactId: string | undefined) {
  return useSyncQuery(() => (contactId ? getContact(contactId) : null), [contactId]);
}

export function useMyselfContact() {
  return useSyncQuery(() => getMyselfContact(), []);
}

export function useGroups() {
  return useSyncQuery(() => listGroups(), []);
}

export function useTags() {
  return useSyncQuery(() => listTags(), []);
}
