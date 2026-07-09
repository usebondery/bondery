import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";
import { prefetchGroupsList } from "@/lib/query/prefetch";
import { GroupsClient } from "./GroupsClient";

const LIST_PARAMS = { previewLimit: 3 };

export async function GroupsLoader() {
  const queryClient = getQueryClient();
  await prefetchGroupsList(queryClient, LIST_PARAMS);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GroupsClient />
    </HydrationBoundary>
  );
}
