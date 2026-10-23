import type { GroupWithCount, TagWithCount } from "@bondery/schemas";
import { type QueryKey, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getContact,
  getContactGroups,
  getContactNamesByIds,
  getContactTags,
  getMyselfContact,
  getMyselfContactId,
  listContactIds,
  listContacts,
} from "../../domains/contacts";
import { getGroup, listGroups as listAllGroups, listGroupMembers } from "../../domains/groups";
import { listTags as listAllTags } from "../../domains/tags";
import type { ContactsListParams } from "../../resources/contacts";
import type { SqliteQueryMeta } from "../refresh-sqlite-views";
import { useSync } from "../SyncProvider";
import { sqliteQueryKeys } from "../sqlite-query-keys";

type SyncQueryOptions<T> = {
  enabled?: boolean;
  queryFn: () => T;
  queryKey: QueryKey;
};

export function useSyncQuery<T>({ enabled = true, queryFn, queryKey }: SyncQueryOptions<T>): {
  data: T;
  error: unknown;
  isInitialSync: boolean;
  pendingCount: number;
  conflictCount: number;
  refresh: () => void;
} {
  const { conflictCount, isInitialSync, isReady, pendingCount } = useSync();
  const queryClient = useQueryClient();

  const query = useQuery({
    enabled: isReady && enabled,
    initialData: queryFn,
    initialDataUpdatedAt: 0,
    meta: {
      sqliteRead: queryFn,
    } satisfies SqliteQueryMeta,
    queryFn,
    queryKey,
  });

  if (query.data === undefined) {
    if (query.error) {
      throw query.error;
    }
    throw new Error("SQLite query functions must return a defined view snapshot");
  }

  return {
    conflictCount,
    data: query.data,
    error: query.error,
    isInitialSync,
    pendingCount,
    refresh: () => {
      queryClient.setQueryData(queryKey, queryFn());
    },
  };
}

export function useContact(contactId: string | undefined) {
  return useSyncQuery({
    enabled: contactId !== undefined,
    queryFn: () => (contactId ? getContact(contactId) : null),
    queryKey: sqliteQueryKeys.contacts.detail(contactId ?? "disabled"),
  });
}

export function useMyselfContact(enabled = true) {
  return useSyncQuery({
    enabled,
    queryFn: () => (enabled ? getMyselfContact() : null),
    queryKey: sqliteQueryKeys.contacts.myself(),
  });
}

export function useMyselfContactId(enabled = true) {
  return useSyncQuery({
    enabled,
    queryFn: () => (enabled ? getMyselfContactId() : null),
    queryKey: [...sqliteQueryKeys.contacts.myself(), "id"],
  });
}

export function useGroups() {
  return useSyncQuery({
    queryFn: () => listAllGroups(),
    queryKey: sqliteQueryKeys.groups.list(),
  });
}

export function useTags() {
  return useSyncQuery({
    queryFn: () => listAllTags(),
    queryKey: sqliteQueryKeys.tags.list(),
  });
}

/** Imperative reads for event handlers. Prefer named hooks for reactive views. */
export function readContactsList(params: ContactsListParams) {
  return listContacts(params);
}

export function readContactIds(params: ContactsListParams) {
  return listContactIds(params);
}

export {
  getContact,
  getContactGroups,
  getContactNamesByIds,
  getContactTags,
  getGroup,
  getMyselfContact,
  getMyselfContactId,
  listAllGroups as listGroups,
  listAllTags as listTags,
  listGroupMembers,
};

export function useContactsList(params: ContactsListParams) {
  return useSyncQuery({
    queryFn: () => listContacts(params),
    queryKey: sqliteQueryKeys.contacts.list(params),
  });
}

export function useContactTags(contactId: string | undefined) {
  return useSyncQuery({
    enabled: contactId !== undefined,
    queryFn: () =>
      contactId
        ? getContactTags(contactId).map((tag): TagWithCount => ({ ...tag, contactCount: 0 }))
        : [],
    queryKey: sqliteQueryKeys.contacts.tags(contactId ?? "disabled"),
  });
}

export function useContactGroups(contactId: string | undefined) {
  return useSyncQuery({
    enabled: contactId !== undefined,
    queryFn: () =>
      contactId
        ? getContactGroups(contactId).map(
            (group): GroupWithCount => ({ ...group, contactCount: 0 }),
          )
        : [],
    queryKey: sqliteQueryKeys.contacts.groups(contactId ?? "disabled"),
  });
}
