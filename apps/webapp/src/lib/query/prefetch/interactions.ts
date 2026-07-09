import type { QueryClient } from "@tanstack/react-query";
import { getInteractionsListServer } from "@/lib/api/domains/server/interactions";
import type { InteractionsListParams } from "@/lib/api/resources/interactions";
import { interactionKeys } from "@/lib/query/keys";

export async function prefetchInteractionsList(
  queryClient: QueryClient,
  params: InteractionsListParams = {},
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getInteractionsListServer(params),
    queryKey: interactionKeys.list(params),
  });
}
