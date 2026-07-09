import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";

import type { ContactsListFilterParams } from "@/lib/query/contactsListParams";

import { GROUP_CARD_PREVIEW, GROUP_MEMBERS_PAGE_SIZE } from "@/lib/query/groupDetailQueryParams";

import {
  prefetchGroupDetail,
  prefetchGroupMembers,
  prefetchGroupMembersInfinite,
} from "@/lib/query/prefetch";
import { GroupDetailClient } from "./GroupDetailClient";

interface GroupDetailLoaderProps {
  filter: ContactsListFilterParams;
  groupId: string;
}

export async function GroupDetailLoader({ groupId, filter }: GroupDetailLoaderProps) {
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchGroupDetail(queryClient, groupId),

    prefetchGroupMembersInfinite(queryClient, groupId, {
      ...filter,

      limit: GROUP_MEMBERS_PAGE_SIZE,
    }),

    prefetchGroupMembers(queryClient, groupId, GROUP_CARD_PREVIEW),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GroupDetailClient groupId={groupId} />
    </HydrationBoundary>
  );
}
