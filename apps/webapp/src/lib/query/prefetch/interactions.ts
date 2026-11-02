import type { QueryClient } from "@tanstack/react-query";
import { getInteractionsListServer } from "@/lib/api/domains/server/interactions";
import type { InteractionsListParams } from "@/lib/api/resources/interactions";
import { fetchInfiniteQueryOrThrow } from "@/lib/query/fetchQueryOrThrow";
import {
  type InteractionsTimelineFilter,
  interactionsInfiniteParams,
} from "@/lib/query/interactionsListParams";
import { interactionKeys } from "@/lib/query/keys";
import { INTERACTIONS_TIMELINE } from "@/lib/query/sharedListParams";

export async function prefetchInteractionsList(
  queryClient: QueryClient,
  params: InteractionsListParams = {},
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getInteractionsListServer(params),
    queryKey: interactionKeys.list(params),
  });
}

function infiniteListParams(filter: InteractionsTimelineFilter) {
  return interactionsInfiniteParams(filter, INTERACTIONS_TIMELINE.limit);
}

export async function prefetchInteractionsInfinite(
  queryClient: QueryClient,
  filter: InteractionsTimelineFilter = {},
): Promise<void> {
  if (filter.start_date || filter.end_date) {
    return;
  }
  const infiniteParams = infiniteListParams(filter);

  await queryClient.prefetchInfiniteQuery({
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      getInteractionsListServer({
        ...infiniteParams,
        offset: pageParam as number,
      }),
    queryKey: interactionKeys.infinite(infiniteParams),
  });
}

export async function fetchInteractionsInfinite(
  queryClient: QueryClient,
  filter: InteractionsTimelineFilter = {},
): Promise<void> {
  if (filter.start_date || filter.end_date) {
    return;
  }
  const infiniteParams = infiniteListParams(filter);

  await fetchInfiniteQueryOrThrow(queryClient, {
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      getInteractionsListServer({
        ...infiniteParams,
        offset: pageParam as number,
      }),
    queryKey: interactionKeys.infinite(infiniteParams),
  });
}
