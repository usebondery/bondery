import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { HomeClient } from "./HomeClient";

import {
  createContactsListQueryFn,
  createInteractionsListQueryFn,
  createUpcomingRemindersQueryFn,
} from "@/lib/query/fetchers/serverQueryFns";

import { contactKeys, interactionKeys, reminderKeys } from "@/lib/query/keys";

import { getQueryClient } from "@/lib/query/client";



const TIMELINE_CONTACTS = { limit: 200, offset: 0 };

const TIMELINE_ACTIVITIES = { limit: 50, offset: 0 };

const STATS_PARAMS = { limit: 1, offset: 0 };

const RECENT_ADDED = { sort: "createdAtDesc" as const, limit: 5, offset: 0 };

const RECENT_INTERACTED = { sort: "interactionDesc" as const, limit: 5, offset: 0 };



export async function HomeLoader() {

  const queryClient = getQueryClient();



  await Promise.all([

    queryClient.prefetchQuery({

      queryKey: contactKeys.list(STATS_PARAMS),

      queryFn: createContactsListQueryFn(STATS_PARAMS),

    }),

    queryClient.prefetchQuery({

      queryKey: reminderKeys.upcoming(),

      queryFn: createUpcomingRemindersQueryFn(),

    }),

    queryClient.prefetchQuery({

      queryKey: contactKeys.list(TIMELINE_CONTACTS),

      queryFn: createContactsListQueryFn(TIMELINE_CONTACTS),

    }),

    queryClient.prefetchQuery({

      queryKey: interactionKeys.list(TIMELINE_ACTIVITIES),

      queryFn: createInteractionsListQueryFn(TIMELINE_ACTIVITIES),

    }),

    queryClient.prefetchQuery({

      queryKey: contactKeys.list(RECENT_ADDED),

      queryFn: createContactsListQueryFn({ ...RECENT_ADDED, avatarPreset: "small" }),

    }),

    queryClient.prefetchQuery({

      queryKey: contactKeys.list(RECENT_INTERACTED),

      queryFn: createContactsListQueryFn({ ...RECENT_INTERACTED, avatarPreset: "small" }),

    }),

  ]);



  return (

    <HydrationBoundary state={dehydrate(queryClient)}>

      <HomeClient />

    </HydrationBoundary>

  );

}


