import type { GroupWithCount, TagWithCount } from "@bondery/schemas";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getContact,
  getContactGroups,
  getContactImportantDates,
  getContactTags,
  getMyselfContact,
  listContacts,
} from "../../domains/contacts";
import { getGroup, listGroups as listAllGroups, listGroupMembers } from "../../domains/groups";
import { listTags as listAllTags } from "../../domains/tags";
import type { ContactsListParams } from "../../resources/contacts";
import { useSync } from "../SyncProvider";

export function useSyncQuery<T>(queryFn: () => T): {
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
  }, []);

  const refresh = useCallback(() => {
    setData(queryFnRef.current());
    bumpRevision();
  }, [bumpRevision]);

  return {
    conflictCount,
    data,
    isInitialSync,
    pendingCount,
    refresh,
    revision,
  };
}

export function useContact(contactId: string | undefined) {
  return useSyncQuery(() => (contactId ? getContact(contactId) : null));
}

export function useMyselfContact() {
  return useSyncQuery(() => getMyselfContact());
}

export function useGroups() {
  return useSyncQuery(() => listAllGroups());
}

export function useTags() {
  return useSyncQuery(() => listAllTags());
}

/** Imperative reads for features (prefer hooks when subscribing to revision). */
export function readContactsList(params: ContactsListParams) {
  return listContacts(params);
}

export {
  getContact,
  getContactGroups,
  getContactTags,
  getGroup,
  getMyselfContact,
  listAllGroups as listGroups,
  listAllTags as listTags,
  listGroupMembers,
};

export function useContactsList(params: ContactsListParams) {
  return useSyncQuery(() => listContacts(params));
}

export function useContactTags(contactId: string | undefined) {
  return useSyncQuery(() =>
    contactId
      ? getContactTags(contactId).map((tag): TagWithCount => ({ ...tag, contactCount: 0 }))
      : [],
  );
}

export function useContactGroups(contactId: string | undefined) {
  return useSyncQuery(() =>
    contactId
      ? getContactGroups(contactId).map((group): GroupWithCount => ({ ...group, contactCount: 0 }))
      : [],
  );
}

export function useContactImportantDates(contactId: string | undefined) {
  return useSyncQuery(() => (contactId ? getContactImportantDates(contactId) : []));
}
