"use client";

import { useQuery } from "@tanstack/react-query";
import { createContactsListQueryFn } from "@/lib/query/fetchers/contacts";
import { createInteractionsListQueryFn } from "@/lib/query/fetchers/interactions";
import { createUpcomingRemindersQueryFn } from "@/lib/query/fetchers/reminders";
import { contactKeys, interactionKeys, reminderKeys } from "@/lib/query/keys";

const HOME_TIMELINE_CONTACTS_LIMIT = 200;
const HOME_TIMELINE_ACTIVITIES_LIMIT = 50;
const HOME_RECENT_LIMIT = 5;

export function useHomeStatsQuery() {
  const listParams = { limit: 1, offset: 0 };
  return useQuery({
    queryKey: contactKeys.list(listParams),
    queryFn: createContactsListQueryFn(listParams),
    select: (data) => data.stats,
  });
}

export function useUpcomingRemindersQuery() {
  return useQuery({
    queryKey: reminderKeys.upcoming(),
    queryFn: createUpcomingRemindersQueryFn(),
  });
}

export function useHomeTimelineQuery() {
  const contactsQuery = useQuery({
    queryKey: contactKeys.list({ limit: HOME_TIMELINE_CONTACTS_LIMIT, offset: 0 }),
    queryFn: createContactsListQueryFn({
      limit: HOME_TIMELINE_CONTACTS_LIMIT,
      offset: 0,
    }),
  });

  const activitiesQuery = useQuery({
    queryKey: interactionKeys.list({ limit: HOME_TIMELINE_ACTIVITIES_LIMIT, offset: 0 }),
    queryFn: createInteractionsListQueryFn({
      limit: HOME_TIMELINE_ACTIVITIES_LIMIT,
      offset: 0,
    }),
  });

  return {
    contacts: contactsQuery.data?.contacts ?? [],
    activities: activitiesQuery.data?.activities ?? [],
    isLoading: contactsQuery.isLoading || activitiesQuery.isLoading,
  };
}

export function useRecentlyAddedContactsQuery() {
  const listParams = { sort: "createdAtDesc" as const, limit: HOME_RECENT_LIMIT, offset: 0 };
  return useQuery({
    queryKey: contactKeys.list(listParams),
    queryFn: createContactsListQueryFn({ ...listParams, avatarPreset: "small" }),
    select: (data) => data.contacts,
  });
}

export function useRecentlyInteractedContactsQuery() {
  const listParams = { sort: "interactionDesc" as const, limit: HOME_RECENT_LIMIT, offset: 0 };
  return useQuery({
    queryKey: contactKeys.list(listParams),
    queryFn: createContactsListQueryFn({ ...listParams, avatarPreset: "small" }),
    select: (data) => data.contacts,
  });
}

export function useHasAnyInteractionQuery() {
  return useQuery({
    queryKey: interactionKeys.list({ limit: 1, offset: 0 }),
    queryFn: createInteractionsListQueryFn({ limit: 1, offset: 0 }),
    select: (data) => data.activities.length > 0,
  });
}
