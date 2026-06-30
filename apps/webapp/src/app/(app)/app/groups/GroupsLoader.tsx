import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { GroupsClient } from "./GroupsClient";

import { createGroupsListQueryFn } from "@/lib/query/fetchers/serverQueryFns";

import { groupKeys } from "@/lib/query/keys";

import { getQueryClient } from "@/lib/query/client";



const LIST_PARAMS = { previewLimit: 3 };



export async function GroupsLoader() {

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({

    queryKey: groupKeys.list(LIST_PARAMS),

    queryFn: createGroupsListQueryFn(LIST_PARAMS),

  });



  return (

    <HydrationBoundary state={dehydrate(queryClient)}>

      <GroupsClient />

    </HydrationBoundary>

  );

}


