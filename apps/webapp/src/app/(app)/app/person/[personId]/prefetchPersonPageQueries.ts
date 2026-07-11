import type { QueryClient } from "@tanstack/react-query";
import {
  PERSON_ALL_TAGS,
  PERSON_MERGE_RECOMMENDATIONS,
  PERSON_SELECTABLE_CONTACTS,
} from "@/lib/query/personPageQueryParams";
import {
  prefetchContactDetail,
  prefetchContactGroups,
  prefetchContactImportantDates,
  prefetchContactInteractionsInfinite,
  prefetchContactLinkedInData,
  prefetchContactRelationships,
  prefetchContactsSelectableList,
  prefetchContactTags,
  prefetchMergeRecommendations,
  prefetchTagsList,
} from "@/lib/query/prefetch";

interface PrefetchPersonPageQueriesOptions {
  skipDetail?: boolean;
}

export async function prefetchPersonPageQueries(
  queryClient: QueryClient,
  personId: string,
  options?: PrefetchPersonPageQueriesOptions,
): Promise<void> {
  const prefetches = [
    prefetchContactLinkedInData(queryClient, personId),
    prefetchContactRelationships(queryClient, personId),
    prefetchContactImportantDates(queryClient, personId),
    prefetchContactTags(queryClient, personId),
    prefetchContactGroups(queryClient, personId),
    prefetchContactInteractionsInfinite(queryClient, personId),
    prefetchContactsSelectableList(queryClient, PERSON_SELECTABLE_CONTACTS),
    prefetchTagsList(queryClient, PERSON_ALL_TAGS),
    prefetchMergeRecommendations(queryClient, PERSON_MERGE_RECOMMENDATIONS),
  ];

  if (!options?.skipDetail) {
    prefetches.unshift(prefetchContactDetail(queryClient, personId));
  }

  await Promise.all(prefetches);
}
