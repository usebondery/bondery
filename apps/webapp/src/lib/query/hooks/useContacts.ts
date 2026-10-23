/** biome-ignore-all lint/style/noExcessiveLinesPerFile: contact query hub coordinates many cache keys */
"use client";

import { patchAffectsMergeRecommendations } from "@bondery/helpers/contact";
import type { Contact } from "@bondery/schemas";
import type { QueryClient } from "@tanstack/react-query";
import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  type MapUrlCamera,
  serializeMapCamera,
} from "@/app/(app)/app/(shell)/map/utils/mapUrlCamera";
import {
  type ContactsListParams,
  createContact,
  createContactRelationship,
  deleteContact,
  deleteContactRelationship,
  deleteContacts,
  deleteContactsFiltered,
  getContactDetail,
  getContactGroups,
  getContactImportantDates,
  getContactInteractions,
  getContactLinkedInData,
  getContactRelationships,
  getContactsList,
  getContactsSelectableList,
  getContactTags,
  getMapPins,
  type ImportantDateInput,
  type MapAddressPinsResult,
  type MapContactPinsResult,
  type MapPinsMode,
  mergeContacts,
  putContactImportantDates,
  type SortOrder,
  shareContact,
  updateContact,
  updateContactRelationship,
  uploadContactPhoto,
} from "@/lib/api/domains/contacts";
import { getInteractionsList } from "@/lib/api/domains/interactions";
import type { ContactsDataResult } from "@/lib/api/resources/contacts";
import type { InteractionsListResult } from "@/lib/api/resources/interactions";
import { refreshAppShell } from "@/lib/app/refreshAppShell";
import {
  boundsFromMapCamera,
  MAP_PINS_VIEWPORT_HEIGHT_PX,
  MAP_PINS_VIEWPORT_WIDTH_PX,
} from "@/lib/contacts/mapPinsBounds";
import { syncMergeRecommendationsAfterChange } from "@/lib/merge/syncMergeRecommendations";
import type { ContactsListFilterParams } from "@/lib/query/contactsListParams";
import {
  invalidateAfterContactMerge,
  invalidateContactDetail,
  invalidateContactDomain,
  invalidateContactImportantDates,
  invalidateContactLists,
  invalidateContactMapPins,
  invalidateContactRelationships,
  invalidateKeepInTouchCount,
  invalidateSettings,
} from "@/lib/query/invalidation";
import { contactKeys } from "@/lib/query/keys";
import { throwIfPageCannotRender } from "@/lib/query/pageLoadFailure";
import { nextPaginatedOffset } from "@/lib/query/paginatedInfiniteQuery";
import { PERSON_INTERACTIONS } from "@/lib/query/personPageQueryParams";
import { INTERACTIONS_TIMELINE } from "@/lib/query/sharedListParams";

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
      ? [
          queryClient.invalidateQueries({ queryKey: contactKeys.keepInTouch() }),
          invalidateKeepInTouchCount(queryClient),
        ]
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
    getNextPageParam: nextPaginatedOffset,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const listParams: ContactsListParams = {
        ...params,
        limit: PAGE_SIZE,
        offset: pageParam as number,
      };
      return getContactsList(listParams);
    },
    queryKey: contactKeys.infinite(params),
    throwOnError: throwIfPageCannotRender,
  });
}

export function useContactQuery(id: string, enabled = true) {
  return useQuery({
    enabled: enabled && !!id,
    queryFn: () => getContactDetail(id),
    queryKey: contactKeys.detail(id),
    throwOnError: throwIfPageCannotRender,
  });
}

export function useContactLinkedInDataQuery(id: string, enabled = true) {
  return useQuery({
    enabled: enabled && !!id,
    queryFn: () => getContactLinkedInData(id),
    queryKey: contactKeys.linkedin(id),
  });
}

export function useContactRelationshipsQuery(contactId: string, enabled = true) {
  return useQuery({
    enabled: enabled && !!contactId,
    queryFn: () => getContactRelationships(contactId),
    queryKey: contactKeys.relationships(contactId),
  });
}

export function useContactImportantDatesQuery(contactId: string, enabled = true) {
  return useQuery({
    enabled: enabled && !!contactId,
    queryFn: () => getContactImportantDates(contactId),
    queryKey: contactKeys.importantDates(contactId),
  });
}

export function useContactTagsQuery(contactId: string, enabled = true) {
  return useQuery({
    enabled: enabled && !!contactId,
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
    enabled: enabled && !!contactId,
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
    enabled: enabled && !!contactId,
    getNextPageParam: nextPaginatedOffset,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      getInteractionsList({
        contactId,
        limit: INTERACTIONS_TIMELINE.limit,
        offset: pageParam as number,
      }),
    queryKey: contactKeys.interactionsInfinite(contactId, infiniteParams),
  });
}

const MAP_PINS_STALE_TIME_MS = 60_000;
/** Keep pin responses across person-detail navigation (default gc is 5 min). */
const MAP_PINS_GC_TIME_MS = 15 * 60_000;

export function useMapPinsQuery(
  mode: "contact",
  camera: MapUrlCamera | null,
  enabled?: boolean,
): UseQueryResult<MapContactPinsResult>;
export function useMapPinsQuery(
  mode: "address",
  camera: MapUrlCamera | null,
  enabled?: boolean,
): UseQueryResult<MapAddressPinsResult>;
export function useMapPinsQuery(
  mode: MapPinsMode,
  camera: MapUrlCamera | null,
  enabled = true,
): UseQueryResult<MapContactPinsResult | MapAddressPinsResult> {
  const cameraKey = camera ? serializeMapCamera(camera) : undefined;
  return useQuery<MapContactPinsResult | MapAddressPinsResult>({
    enabled: enabled && camera != null,
    gcTime: MAP_PINS_GC_TIME_MS,
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      if (!camera) {
        throw new Error("Map camera is required");
      }
      const bounds = boundsFromMapCamera(camera, {
        heightPx: MAP_PINS_VIEWPORT_HEIGHT_PX,
        widthPx: MAP_PINS_VIEWPORT_WIDTH_PX,
      });
      if (mode === "contact") {
        return getMapPins("contact", bounds);
      }
      return getMapPins("address", bounds);
    },
    queryKey: contactKeys.mapPins(mode, cameraKey),
    staleTime: MAP_PINS_STALE_TIME_MS,
    throwOnError: throwIfPageCannotRender,
  });
}

export function useContactGroupsQuery(contactId: string, enabled = true) {
  return useQuery({
    enabled: enabled && !!contactId,
    queryFn: () => getContactGroups(contactId),
    queryKey: contactKeys.groups(contactId),
  });
}

export function useContactGroupsQueries(contactIds: string[]) {
  return useQueries({
    queries: contactIds.map((contactId) => ({
      enabled: !!contactId,
      queryFn: () => getContactGroups(contactId),
      queryKey: contactKeys.groups(contactId),
    })),
  });
}

export function useCreateContactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContact,
    onSuccess: async () => {
      await invalidateContactDomain(queryClient);
    },
  });
}

export function useUpdateContactMutation(
  contactId: string,
  options?: { syncSettingsOnFirstNameChange?: boolean },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateContactPatch) => updateContact(contactId, patch),
    onSuccess: async (_data, patch) => {
      await invalidateAfterContactUpdate(queryClient, contactId, patch);
      if (options?.syncSettingsOnFirstNameChange && "firstName" in patch) {
        await invalidateSettings(queryClient);
        refreshAppShell();
      }
      if (patchAffectsMergeRecommendations(patch)) {
        await syncMergeRecommendationsAfterChange(queryClient);
      }
    },
  });
}

export function useUploadContactPhotoMutation(
  contactId: string,
  options?: { syncSettings?: boolean },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadContactPhoto(contactId, file),
    onSuccess: async ({ avatarUrl }) => {
      if (avatarUrl) {
        queryClient.setQueryData<Contact | undefined>(contactKeys.detail(contactId), (current) =>
          current ? { ...current, avatar: avatarUrl } : current,
        );
      }

      await Promise.all([
        invalidateContactDetail(queryClient, contactId),
        options?.syncSettings
          ? Promise.all([invalidateSettings(queryClient), Promise.resolve(refreshAppShell())])
          : Promise.resolve(),
      ]);
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
      if (patchAffectsMergeRecommendations(patch)) {
        await syncMergeRecommendationsAfterChange(queryClient);
      }
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
    onSuccess: (data) => {
      void invalidateAfterContactMerge(queryClient, data);
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
  const result = await mergeContacts(input);
  await invalidateAfterContactMerge(queryClient, result);
  return result;
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
