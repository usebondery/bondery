import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getContactsListServer } from "@/lib/api/domains/server/contacts";
import { getQueryClient } from "@/lib/query/client";
import type { ContactsListFilterParams } from "@/lib/query/contactsListParams";
import { contactKeys } from "@/lib/query/keys";
import { PeopleClient } from "../PeopleClient";

interface PeopleTableLoaderProps {
  filter: ContactsListFilterParams;
  savedColumnVisibility?: { key: string; visible: boolean }[];
}

const PAGE_SIZE = 50;

/**
 * Prefetches the contacts infinite query and hydrates PeopleClient.
 */
export async function PeopleTableLoader({ filter, savedColumnVisibility }: PeopleTableLoaderProps) {
  const queryClient = getQueryClient();

  await queryClient.prefetchInfiniteQuery({
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      getContactsListServer({
        ...filter,
        limit: PAGE_SIZE,
        offset: pageParam as number,
      }),
    queryKey: contactKeys.infinite(filter),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PeopleClient savedColumnVisibility={savedColumnVisibility} />
    </HydrationBoundary>
  );
}
