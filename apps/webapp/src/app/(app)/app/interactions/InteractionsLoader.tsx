import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";

import { prefetchContactsList, prefetchInteractionsList } from "@/lib/query/prefetch";

import { INTERACTIONS_TIMELINE, SELECTABLE_CONTACTS } from "@/lib/query/sharedListParams";
import { InteractionsClient } from "./InteractionsClient";

export async function InteractionsLoader() {
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchContactsList(queryClient, SELECTABLE_CONTACTS),
    prefetchInteractionsList(queryClient, INTERACTIONS_TIMELINE),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InteractionsClient />
    </HydrationBoundary>
  );
}
