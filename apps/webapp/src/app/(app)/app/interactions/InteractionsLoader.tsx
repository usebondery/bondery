import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";

import { prefetchContactsSelectableList, prefetchInteractionsInfinite } from "@/lib/query/prefetch";

import { SELECTABLE_CONTACTS } from "@/lib/query/sharedListParams";
import { InteractionsClient } from "./InteractionsClient";

export async function InteractionsLoader() {
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchContactsSelectableList(queryClient, SELECTABLE_CONTACTS),
    prefetchInteractionsInfinite(queryClient),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InteractionsClient />
    </HydrationBoundary>
  );
}
