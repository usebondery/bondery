import {
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { PeopleClient } from "../PeopleClient";
import { createContactsListQueryFn } from "@/lib/query/fetchers/serverQueryFns";
import type { ContactsListFilterParams } from "@/lib/query/fetchers/contactsListParams";
import { contactKeys } from "@/lib/query/keys";
import { getQueryClient } from "@/lib/query/client";

interface PeopleTableLoaderProps {
  filter: ContactsListFilterParams;
  savedColumnVisibility?: { key: string; visible: boolean }[];
}

const PAGE_SIZE = 50;

/**
 * Prefetches the contacts infinite query and hydrates PeopleClient.
 */
export async function PeopleTableLoader({
  filter,
  savedColumnVisibility,
}: PeopleTableLoaderProps) {
  const queryClient = getQueryClient();

  await queryClient.prefetchInfiniteQuery({
    queryKey: contactKeys.infinite(filter),
    queryFn: async ({ pageParam }) =>
      createContactsListQueryFn({
        ...filter,
        limit: PAGE_SIZE,
        offset: pageParam as number,
      })(),
    initialPageParam: 0,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PeopleClient savedColumnVisibility={savedColumnVisibility} />
    </HydrationBoundary>
  );
}
