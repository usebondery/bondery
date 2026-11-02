import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";
import {
  type InteractionsListFilter,
  timelineFilterFromParsed,
} from "@/lib/query/interactionsListParams";
import { fetchInteractionsInfinite, prefetchContactsSelectableList } from "@/lib/query/prefetch";

import { SELECTABLE_CONTACTS } from "@/lib/query/sharedListParams";
import { InteractionsClient } from "./InteractionsClient";

export async function InteractionsLoader({ filter }: { filter: InteractionsListFilter }) {
  const queryClient = getQueryClient();
  const listFilter = timelineFilterFromParsed(filter);
  const prefetches = [prefetchContactsSelectableList(queryClient, SELECTABLE_CONTACTS)];
  if (!listFilter.start_date && !listFilter.end_date) {
    prefetches.push(fetchInteractionsInfinite(queryClient, listFilter));
  }

  await Promise.all(prefetches);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InteractionsClient />
    </HydrationBoundary>
  );
}
