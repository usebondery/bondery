import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";

import {
  prefetchContactsList,
  prefetchInteractionsList,
  prefetchUpcomingReminders,
} from "@/lib/query/prefetch";

import { INTERACTIONS_TIMELINE, SELECTABLE_CONTACTS } from "@/lib/query/sharedListParams";
import { HomeClient } from "./HomeClient";

const TIMELINE_CONTACTS = SELECTABLE_CONTACTS;

const TIMELINE_ACTIVITIES = INTERACTIONS_TIMELINE;

const STATS_PARAMS = { limit: 1, offset: 0 };

const RECENT_ADDED = { limit: 5, offset: 0, sort: "createdAtDesc" as const };

const RECENT_INTERACTED = { limit: 5, offset: 0, sort: "interactionDesc" as const };

export async function HomeLoader() {
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchContactsList(queryClient, STATS_PARAMS),
    prefetchUpcomingReminders(queryClient),
    prefetchContactsList(queryClient, TIMELINE_CONTACTS),
    prefetchInteractionsList(queryClient, TIMELINE_ACTIVITIES),
    prefetchContactsList(queryClient, { ...RECENT_ADDED, avatarPreset: "small" }),
    prefetchContactsList(queryClient, { ...RECENT_INTERACTED, avatarPreset: "small" }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeClient />
    </HydrationBoundary>
  );
}
