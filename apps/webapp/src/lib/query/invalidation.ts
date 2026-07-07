import type { QueryClient } from "@tanstack/react-query";
import {
  chatKeys,
  contactKeys,
  groupKeys,
  interactionKeys,
  mergeRecommendationKeys,
  reminderKeys,
  settingsKeys,
  tagKeys,
} from "./keys";

export async function invalidateContactDomain(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: contactKeys.all });
}

export async function invalidateContactLists(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
}

/** Map pins are viewport-scoped but must refresh after geo/address edits. */
export async function invalidateContactMapPins(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: [...contactKeys.all, "map-pins"] });
}

export async function invalidateContactDetail(
  queryClient: QueryClient,
  id: string,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: contactKeys.detail(id) });
}

export async function invalidateContactRelationships(
  queryClient: QueryClient,
  id: string,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: contactKeys.relationships(id) });
}

export async function invalidateContactImportantDates(
  queryClient: QueryClient,
  id: string,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: contactKeys.importantDates(id) });
}

export async function invalidateSettings(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: settingsKeys.all });
}

export async function invalidateApiKeys(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: settingsKeys.apiKeys() });
}

export async function invalidateTagDomain(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: tagKeys.all });
}

export async function invalidateInteractionDomain(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: interactionKeys.all });
}

export async function invalidateGroupDomain(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: groupKeys.all });
}

export async function invalidateMergeRecommendationDomain(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: mergeRecommendationKeys.all });
}

export async function invalidateReminderDomain(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: reminderKeys.all });
}

export async function invalidateChatSessions(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: chatKeys.sessions() });
}

/** Post-import burst: contacts, merge recommendations, and groups. */
export async function invalidateAfterImport(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    invalidateContactDomain(queryClient),
    invalidateMergeRecommendationDomain(queryClient),
    invalidateGroupDomain(queryClient),
    invalidateSettings(queryClient),
  ]);
}

/** After enrich batch completes. */
export async function invalidateAfterEnrichBatch(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    invalidateContactDomain(queryClient),
    invalidateMergeRecommendationDomain(queryClient),
    invalidateSettings(queryClient),
  ]);
}
