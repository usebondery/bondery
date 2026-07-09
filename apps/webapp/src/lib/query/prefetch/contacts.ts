import type { QueryClient } from "@tanstack/react-query";
import {
  getContactDetailServer,
  getContactGroupsServer,
  getContactImportantDatesServer,
  getContactInteractionsServer,
  getContactLinkedInDataServer,
  getContactRelationshipsServer,
  getContactsListServer,
  getContactTagsServer,
} from "@/lib/api/domains/server/contacts";
import type { ContactInteractionsParams, ContactsListParams } from "@/lib/api/resources/contacts";
import type { AvatarPreset } from "@/lib/contacts/avatarParams";
import { contactKeys } from "@/lib/query/keys";

export async function prefetchContactsList(
  queryClient: QueryClient,
  params: ContactsListParams,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getContactsListServer(params),
    queryKey: contactKeys.list(params),
  });
}

export async function prefetchContactDetail(
  queryClient: QueryClient,
  contactId: string,
  avatarPreset: AvatarPreset = "large",
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getContactDetailServer(contactId, avatarPreset),
    queryKey: contactKeys.detail(contactId),
  });
}

export async function prefetchContactLinkedInData(
  queryClient: QueryClient,
  contactId: string,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getContactLinkedInDataServer(contactId),
    queryKey: contactKeys.linkedin(contactId),
  });
}

export async function prefetchContactRelationships(
  queryClient: QueryClient,
  contactId: string,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getContactRelationshipsServer(contactId),
    queryKey: contactKeys.relationships(contactId),
  });
}

export async function prefetchContactImportantDates(
  queryClient: QueryClient,
  contactId: string,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getContactImportantDatesServer(contactId),
    queryKey: contactKeys.importantDates(contactId),
  });
}

export async function prefetchContactTags(
  queryClient: QueryClient,
  contactId: string,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getContactTagsServer(contactId),
    queryKey: contactKeys.tags(contactId),
  });
}

export async function prefetchContactGroups(
  queryClient: QueryClient,
  contactId: string,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getContactGroupsServer(contactId),
    queryKey: contactKeys.groups(contactId),
  });
}

export async function prefetchContactInteractions(
  queryClient: QueryClient,
  contactId: string,
  params: ContactInteractionsParams,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getContactInteractionsServer(contactId, params),
    queryKey: contactKeys.interactions(contactId, params),
  });
}
