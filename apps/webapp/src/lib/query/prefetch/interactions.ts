import type { QueryClient } from "@tanstack/react-query";
import { getInteractionsListServer } from "@/lib/api/domains/server/interactions";
import type { InteractionsListParams } from "@/lib/api/resources/interactions";
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

export async function prefetchInteractionsInfinite(queryClient: QueryClient): Promise<void> {
  const infiniteParams = { limit: INTERACTIONS_TIMELINE.limit };

  await queryClient.prefetchInfiniteQuery({
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      getInteractionsListServer({
        limit: INTERACTIONS_TIMELINE.limit,
        offset: pageParam as number,
      }),
    queryKey: interactionKeys.infinite(infiniteParams),
  });
}
