"use client";

import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  useInfiniteQuery,
  useQueries,
  useQuery,
} from "@tanstack/react-query";
import {
  type ContactsListParams,
  getContactDetail,
  getContactGroups,
  getContactImportantDates,
  getContactInteractions,
  getContactLinkedInData,
  getContactRelationships,
  getContactsList,
  getContactsSelectableList,
  getContactTags,
  getRelationshipGraph,
  type SortOrder,
} from "@/lib/api/domains/contacts";
import { getInteractionsList } from "@/lib/api/domains/interactions";
import { isMissingContactError } from "@/lib/api/isMissingContactError";
import type { ContactsDataResult } from "@/lib/api/resources/contacts";
import type { InteractionsListResult } from "@/lib/api/resources/interactions";
import type { ContactsListFilterParams } from "@/lib/query/contactsListParams";
import { contactKeys } from "@/lib/query/keys";
import { throwIfPageCannotRender } from "@/lib/query/pageLoadFailure";
import { nextPaginatedOffset } from "@/lib/query/paginatedInfiniteQuery";
import { PERSON_INTERACTIONS } from "@/lib/query/personPageQueryParams";
import { INTERACTIONS_TIMELINE } from "@/lib/query/sharedListParams";

const PAGE_SIZE = 50;

export function useContactsListQuery(params: {
  search?: string;
  sort?: SortOrder;
  limit?: number;
  enabled?: boolean;
}) {
  const listParams: ContactsListParams = {
    limit: params.limit ?? PAGE_SIZE,
    offset: 0,
    search: params.search,
    sort: params.sort,
  };
  return useQuery({
    enabled: params.enabled !== false,
    queryFn: () => getContactsList(listParams),
    queryKey: contactKeys.list(listParams),
  });
}

export function useContactsSelectableListQuery(params: {
  search?: string;
  sort?: SortOrder;
  limit?: number;
  enabled?: boolean;
}) {
  const listParams: ContactsListParams = {
    limit: params.limit ?? PAGE_SIZE,
    offset: 0,
    search: params.search,
    sort: params.sort,
  };
  return useQuery({
    enabled: params.enabled !== false,
    queryFn: () => getContactsSelectableList(listParams),
    queryKey: contactKeys.selectable.list(listParams),
  });
}

/** Loads full contact rows for picker chips when IDs are not in a prefetched list. */
export function useContactDetailsQueries(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  return useQueries({
    queries: uniqueIds.map((id) => ({
      enabled: Boolean(id),
      queryFn: () => getContactDetail(id),
      queryKey: contactKeys.detail(id),
    })),
  });
}

export function useContactsInfiniteQuery(
  params: ContactsListFilterParams,
): UseInfiniteQueryResult<InfiniteData<ContactsDataResult>, Error> {
  return useInfiniteQuery<ContactsDataResult>({
    queryFn: async ({ pageParam }) => {
      const listParams: ContactsListParams = {
        ...params,
        limit: PAGE_SIZE,
        offset: pageParam as number,
      };
      return getContactsList(listParams);
    },
    initialPageParam: 0,
    getNextPageParam: nextPaginatedOffset,
    queryKey: contactKeys.infinite(params),
    throwOnError: throwIfPageCannotRender,
  });
}

export function useContactQuery(id: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(id),
    queryFn: () => getContactDetail(id),
    queryKey: contactKeys.detail(id),
    throwOnError: throwIfPageCannotRender,
  });
}

export function useContactLinkedInDataQuery(id: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(id),
    queryFn: () => getContactLinkedInData(id),
    queryKey: contactKeys.linkedin(id),
  });
}

export function useContactRelationshipsQuery(contactId: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(contactId),
    queryFn: () => getContactRelationships(contactId),
    queryKey: contactKeys.relationships(contactId),
  });
}

export function useContactImportantDatesQuery(contactId: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(contactId),
    queryFn: () => getContactImportantDates(contactId),
    queryKey: contactKeys.importantDates(contactId),
  });
}

export function useContactTagsQuery(contactId: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(contactId),
    queryFn: () => getContactTags(contactId),
    queryKey: contactKeys.tags(contactId),
  });
}

export function useContactInteractionsQuery(
  contactId: string,
  params: Omit<typeof PERSON_INTERACTIONS, "contactId"> = PERSON_INTERACTIONS,
  enabled = true,
) {
  return useQuery({
    enabled: enabled && Boolean(contactId),
    queryFn: () => getContactInteractions(contactId, params),
    queryKey: contactKeys.interactions(contactId, params),
  });
}

export function useContactInteractionsInfiniteQuery(
  contactId: string,
  enabled = true,
): UseInfiniteQueryResult<InfiniteData<InteractionsListResult>, Error> {
  const infiniteParams = { limit: INTERACTIONS_TIMELINE.limit };

  return useInfiniteQuery<InteractionsListResult>({
    enabled: enabled && Boolean(contactId),
    queryFn: async ({ pageParam }) =>
      getInteractionsList({
        contactId,
        limit: INTERACTIONS_TIMELINE.limit,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: nextPaginatedOffset,
    queryKey: contactKeys.interactionsInfinite(contactId, infiniteParams),
  });
}

export function useRelationshipGraphQuery(focus: string | null, enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => getRelationshipGraph(focus),
    queryKey: contactKeys.relationshipGraph(focus),
    throwOnError: (error, query) => {
      if (query.state.data !== undefined) {
        return false;
      }
      if (isMissingContactError(error)) {
        return true;
      }
      return throwIfPageCannotRender(error, query);
    },
  });
}

export function useContactGroupsQuery(contactId: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(contactId),
    queryFn: () => getContactGroups(contactId),
    queryKey: contactKeys.groups(contactId),
  });
}

export function useContactGroupsQueries(contactIds: string[]) {
  return useQueries({
    queries: contactIds.map((contactId) => ({
      enabled: Boolean(contactId),
      queryFn: () => getContactGroups(contactId),
      queryKey: contactKeys.groups(contactId),
    })),
  });
}

export type { Contact } from "@bondery/schemas";
export type { SortOrder } from "@/lib/api/domains/contacts";
