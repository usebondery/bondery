import type { MergeContactsResponse, MergeRecommendation } from "@bondery/schemas";
import type { QueryClient } from "@tanstack/react-query";
import {
  chatKeys,
  contactKeys,
  enrichQueueKeys,
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

/** Cancel and drop cached queries for a contact deleted by merge. */
export async function dropMergedContactQueries(
  queryClient: QueryClient,
  mergedFromPersonId: string,
): Promise<void> {
  await queryClient.cancelQueries({ queryKey: contactKeys.detail(mergedFromPersonId) });
  queryClient.removeQueries({ queryKey: contactKeys.detail(mergedFromPersonId) });
}

/** Drop stale duplicate cards that still point at a contact deleted by merge. */
export function stripDeletedPersonFromMergeRecommendations(
  queryClient: QueryClient,
  deletedPersonId: string,
): void {
  queryClient.setQueriesData<MergeRecommendation[]>(
    { queryKey: mergeRecommendationKeys.all },
    (current) => {
      if (!Array.isArray(current)) {
        return current;
      }
      return current.filter(
        (recommendation) =>
          recommendation.leftPerson.id !== deletedPersonId &&
          recommendation.rightPerson.id !== deletedPersonId,
      );
    },
  );
}

export async function invalidateContactLists(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
}

/** Map pins are viewport-scoped but must refresh after geo/address edits. */
export async function invalidateContactMapPins(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: [...contactKeys.all, "map-pins"] });
}

export async function invalidateContactDetail(queryClient: QueryClient, id: string): Promise<void> {
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

export async function invalidateContactTags(queryClient: QueryClient, id: string): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: contactKeys.tags(id) });
}

export async function invalidateContactInteractions(
  queryClient: QueryClient,
  id: string,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: [...contactKeys.detail(id), "interactions"] });
}

export async function invalidateAllContactTags(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === contactKeys.all[0] &&
      query.queryKey[1] === "detail" &&
      query.queryKey.includes("tags"),
  });
}

export async function invalidateAllContactInteractions(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === contactKeys.all[0] &&
      query.queryKey[1] === "detail" &&
      query.queryKey.includes("interactions"),
  });
}

export async function invalidateSettings(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: settingsKeys.all });
}

export async function invalidateApiKeys(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: settingsKeys.apiKeys() });
}

export async function invalidateMcpConsents(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: settingsKeys.mcpConsents() });
}

export async function invalidatePasskeys(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: settingsKeys.passkeys() });
}

export async function invalidateSubscription(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: settingsKeys.subscription() });
}

export async function invalidateTagDomain(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: tagKeys.all });
}

export async function invalidateInteractionDomain(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: interactionKeys.all }),
    invalidateAllContactInteractions(queryClient),
  ]);
}

export async function invalidateGroupDomain(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: groupKeys.all });
}

export async function invalidateMergeRecommendationDomain(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries(
    { queryKey: mergeRecommendationKeys.all },
    { throwOnError: false },
  );
}

export async function invalidateEnrichQueueDomain(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: enrichQueueKeys.all }, { throwOnError: false });
}

/** Shell badge: merge + enrich count queries and related list/status caches. */
export async function invalidateContactsAttention(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    invalidateMergeRecommendationDomain(queryClient),
    invalidateEnrichQueueDomain(queryClient),
  ]);
}

/** Refresh caches after a merge without failing the mutation if the deleted contact 404s. */
export async function invalidateAfterContactMerge(
  queryClient: QueryClient,
  result: MergeContactsResponse,
): Promise<void> {
  await dropMergedContactQueries(queryClient, result.mergedFromPersonId);
  stripDeletedPersonFromMergeRecommendations(queryClient, result.mergedFromPersonId);
  if (result.contact) {
    queryClient.setQueryData(contactKeys.detail(result.personId), result.contact);
  }

  try {
    await Promise.all([
      queryClient.invalidateQueries(
        { queryKey: contactKeys.all, refetchType: "active" },
        { throwOnError: false },
      ),
      invalidateContactsAttention(queryClient),
    ]);
  } catch {
    // Merge already persisted; a 404 on the deleted contact must not fail the mutation.
  }
}

export async function invalidateKeepInTouchCount(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: contactKeys.keepInTouchCount() });
}

export async function invalidateReminderDomain(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: reminderKeys.all });
}

export async function invalidateChatSessions(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: chatKeys.sessions() });
}

export async function invalidateChatSessionMessages(
  queryClient: QueryClient,
  sessionId: string,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: chatKeys.messages(sessionId) });
}

/** Post-import burst: contacts, groups, tags, interactions, and merge recommendations. */
export async function invalidateAfterImport(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    invalidateContactDomain(queryClient),
    invalidateContactsAttention(queryClient),
    invalidateKeepInTouchCount(queryClient),
    invalidateGroupDomain(queryClient),
    invalidateTagDomain(queryClient),
    invalidateInteractionDomain(queryClient),
    invalidateMergeRecommendationDomain(queryClient),
    invalidateSettings(queryClient),
  ]);
}

/** After enrich batch completes. */
export async function invalidateAfterEnrichBatch(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    invalidateContactDomain(queryClient),
    invalidateContactsAttention(queryClient),
    invalidateSettings(queryClient),
  ]);
}
