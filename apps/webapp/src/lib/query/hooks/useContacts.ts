"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Contact, LinkedInDataResponse } from "@bondery/schemas";
import {
  createContact,
  createContactRelationship,
  deleteContact,
  deleteContactRelationship,
  deleteContacts,
  deleteContactsFiltered,
  mergeContacts,
  putContactImportantDates,
  shareContact,
  updateContact,
  updateContactRelationship,
  type ImportantDateInput,
} from "@/lib/api/domains/contacts";
import {
  createContactsListQueryFn,
  createContactDetailQueryFn,
  createContactLinkedInDataQueryFn,
  createContactGroupsQueryFn,
  createMapPinsQueryFn,
  type ContactsListParams,
  type MapPinsBounds,
  type MapPinsMode,
  type SortOrder,
} from "@/lib/query/fetchers/contacts";
import type { ContactsListFilterParams } from "@/lib/query/fetchers/contactsListParams";
import { contactKeys } from "@/lib/query/keys";
import type { QueryClient } from "@tanstack/react-query";
import {
  invalidateContactDetail,
  invalidateContactDomain,
  invalidateContactImportantDates,
  invalidateContactLists,
  invalidateContactMapPins,
  invalidateContactRelationships,
} from "@/lib/query/invalidation";

type UpdateContactPatch = Parameters<typeof updateContact>[1];

function patchAffectsKeepInTouch(patch: UpdateContactPatch): boolean {
  return "lastInteraction" in patch || "keepFrequencyDays" in patch;
}

function patchAffectsMapPins(patch: UpdateContactPatch): boolean {
  return (
    "location" in patch ||
    "latitude" in patch ||
    "longitude" in patch ||
    "gisPoint" in patch ||
    "addresses" in patch
  );
}

async function invalidateAfterContactUpdate(
  queryClient: QueryClient,
  contactId: string,
  patch: UpdateContactPatch,
): Promise<void> {
  await Promise.all([
    invalidateContactDetail(queryClient, contactId),
    invalidateContactLists(queryClient),
    ...(patchAffectsMapPins(patch) ? [invalidateContactMapPins(queryClient)] : []),
    ...(patchAffectsKeepInTouch(patch)
      ? [queryClient.invalidateQueries({ queryKey: contactKeys.keepInTouch() })]
      : []),
  ]);
}

const PAGE_SIZE = 50;

export function useContactsListQuery(params: {
  search?: string;
  sort?: SortOrder;
  limit?: number;
  enabled?: boolean;
}) {
  const listParams: ContactsListParams = {
    search: params.search,
    sort: params.sort,
    limit: params.limit ?? PAGE_SIZE,
    offset: 0,
  };
  return useQuery({
    queryKey: contactKeys.list(listParams),
    queryFn: createContactsListQueryFn(listParams),
    enabled: params.enabled !== false,
  });
}

export function useContactsInfiniteQuery(params: ContactsListFilterParams) {
  return useInfiniteQuery({
    queryKey: contactKeys.infinite(params),
    queryFn: async ({ pageParam }) => {
      const listParams: ContactsListParams = {
        ...params,
        limit: PAGE_SIZE,
        offset: pageParam as number,
      };
      return createContactsListQueryFn(listParams)();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination.hasMore) return undefined;
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
  });
}

export function useContactQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: createContactDetailQueryFn(id),
    enabled: enabled && !!id,
  });
}

export function useContactLinkedInDataQuery(
  id: string,
  initialData?: LinkedInDataResponse,
  enabled = true,
) {
  return useQuery({
    queryKey: contactKeys.linkedin(id),
    queryFn: createContactLinkedInDataQueryFn(id),
    enabled: enabled && !!id,
    initialData,
  });
}

export function useMapPinsQuery(
  mode: MapPinsMode,
  bounds: MapPinsBounds | null,
  enabled = true,
) {
  return useQuery({
    queryKey: contactKeys.mapPins(mode, bounds ?? undefined),
    queryFn: () => createMapPinsQueryFn(mode, bounds!)(),
    enabled: enabled && bounds != null,
  });
}

export function useContactGroupsQuery(contactId: string, enabled = true) {
  return useQuery({
    queryKey: contactKeys.groups(contactId),
    queryFn: createContactGroupsQueryFn(contactId),
    enabled: enabled && !!contactId,
  });
}

export function useContactGroupsQueries(contactIds: string[]) {
  return useQueries({
    queries: contactIds.map((contactId) => ({
      queryKey: contactKeys.groups(contactId),
      queryFn: createContactGroupsQueryFn(contactId),
      enabled: !!contactId,
    })),
  });
}

export function useCreateContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContact,
    onSuccess: async () => {
      await invalidateContactLists(queryClient);
    },
  });
}

export function useUpdateContactMutation(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateContactPatch) => updateContact(contactId, patch),
    onSuccess: async (_data, patch) => {
      await invalidateAfterContactUpdate(queryClient, contactId, patch);
    },
  });
}

export function usePatchContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateContactPatch }) =>
      updateContact(id, patch),
    onSuccess: async (_data, { id, patch }) => {
      await invalidateAfterContactUpdate(queryClient, id, patch);
    },
  });
}

export function useCreateContactRelationshipMutation(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createContactRelationship>[1]) =>
      createContactRelationship(contactId, input),
    onSuccess: async () => {
      await invalidateContactRelationships(queryClient, contactId);
    },
  });
}

export function useUpdateContactRelationshipMutation(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      relationshipId,
      input,
    }: {
      relationshipId: string;
      input: Parameters<typeof updateContactRelationship>[2];
    }) => updateContactRelationship(contactId, relationshipId, input),
    onSuccess: async () => {
      await invalidateContactRelationships(queryClient, contactId);
    },
  });
}

export function useDeleteContactRelationshipMutation(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (relationshipId: string) => deleteContactRelationship(contactId, relationshipId),
    onSuccess: async () => {
      await invalidateContactRelationships(queryClient, contactId);
    },
  });
}

export function usePutContactImportantDatesMutation(contactId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dates: ImportantDateInput[]) => putContactImportantDates(contactId, dates),
    onSuccess: async () => {
      await invalidateContactImportantDates(queryClient, contactId);
    },
  });
}

export function useDeleteContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContact,
    onSuccess: async () => {
      await invalidateContactDomain(queryClient);
    },
  });
}

export function useDeleteContactsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContacts,
    onSuccess: async () => {
      await invalidateContactDomain(queryClient);
    },
  });
}

export function useDeleteContactsFilteredMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContactsFiltered,
    onSuccess: async () => {
      await invalidateContactDomain(queryClient);
    },
  });
}

export function useMergeContactsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mergeContacts,
    onSuccess: async () => {
      await invalidateContactDomain(queryClient);
    },
  });
}

/** Imperative delete for modal confirm handlers (no hook context). */
export async function deleteContactsWithInvalidation(
  queryClient: ReturnType<typeof useQueryClient>,
  ids: string[],
) {
  await deleteContacts(ids);
  await invalidateContactDomain(queryClient);
}

/** Imperative merge for modal confirm handlers (no hook context). */
export async function mergeContactsWithInvalidation(
  queryClient: ReturnType<typeof useQueryClient>,
  input: Parameters<typeof mergeContacts>[0],
) {
  await mergeContacts(input);
  await invalidateContactDomain(queryClient);
}

/** Imperative create for modal confirm handlers (no hook context). */
export async function createContactWithInvalidation(
  queryClient: ReturnType<typeof useQueryClient>,
  input: Parameters<typeof createContact>[0],
) {
  const result = await createContact(input);
  await invalidateContactLists(queryClient);
  return result;
}

export async function deleteContactsFilteredWithInvalidation(
  queryClient: ReturnType<typeof useQueryClient>,
  payload: Parameters<typeof deleteContactsFiltered>[0],
) {
  const result = await deleteContactsFiltered(payload);
  await invalidateContactDomain(queryClient);
  return result;
}

export function useShareContactMutation() {
  return useMutation({
    mutationFn: shareContact,
  });
}

export async function shareContactFromHooks(body: Parameters<typeof shareContact>[0]) {
  await shareContact(body);
}

export type { Contact, SortOrder };
