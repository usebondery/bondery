"use client";

import { patchAffectsMergeRecommendations } from "@bondery/helpers/contact";
import type { Contact } from "@bondery/schemas";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createContact,
  createContactRelationship,
  deleteContact,
  deleteContactRelationship,
  deleteContacts,
  deleteContactsFiltered,
  type ImportantDateInput,
  mergeContacts,
  putContactImportantDates,
  shareContact,
  updateContact,
  updateContactRelationship,
  uploadContactPhoto,
} from "@/lib/api/domains/contacts";
import { refreshAppShell } from "@/lib/app/refreshAppShell";
import { syncMergeRecommendationsAfterChange } from "@/lib/merge/syncMergeRecommendations";
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
import { contactKeys, interactionKeys } from "@/lib/query/keys";

export type UpdateContactPatch = Parameters<typeof updateContact>[1];

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

export async function invalidateAfterContactUpdate(
  queryClient: QueryClient,
  contactId: string,
  patch: UpdateContactPatch,
): Promise<void> {
  await Promise.all([
    invalidateContactDetail(queryClient, contactId),
    invalidateContactLists(queryClient),
    // Interactions embed a participant snapshot (name, avatar, headline, location).
    queryClient.invalidateQueries({ queryKey: interactionKeys.all }),
    ...(patchAffectsMapPins(patch) ? [invalidateContactMapPins(queryClient)] : []),
    ...(patchAffectsKeepInTouch(patch)
      ? [
          queryClient.invalidateQueries({ queryKey: contactKeys.keepInTouch() }),
          invalidateKeepInTouchCount(queryClient),
        ]
      : []),
  ]);
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

export function useShareContactMutation() {
  return useMutation({
    mutationFn: shareContact,
  });
}
