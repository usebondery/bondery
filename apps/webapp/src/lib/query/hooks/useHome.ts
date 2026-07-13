"use client";

import { useQuery } from "@tanstack/react-query";

import { getContactsList, getContactsSelectableList } from "@/lib/api/domains/contacts";

import { getInteractionsList } from "@/lib/api/domains/interactions";

import { getUpcomingReminders } from "@/lib/api/domains/reminders";
import { contactKeys, interactionKeys, reminderKeys } from "@/lib/query/keys";
import { INTERACTIONS_TIMELINE, SELECTABLE_CONTACTS } from "@/lib/query/sharedListParams";

const HOME_RECENT_LIMIT = 5;

export function useHomeStatsQuery() {
  const listParams = { limit: 1, offset: 0 };

  return useQuery({
    queryFn: () => getContactsList(listParams),
    queryKey: contactKeys.list(listParams),

    select: (data) => data.stats,
  });
}

export function useUpcomingRemindersQuery() {
  return useQuery({
    queryFn: getUpcomingReminders,
    queryKey: reminderKeys.upcoming(),
  });
}

export function useHomeTimelineQuery() {
  const contactsQuery = useQuery({
    queryFn: () => getContactsSelectableList(SELECTABLE_CONTACTS),
    queryKey: contactKeys.selectable.list(SELECTABLE_CONTACTS),
  });

  const activitiesQuery = useQuery({
    queryFn: () => getInteractionsList(INTERACTIONS_TIMELINE),
    queryKey: interactionKeys.list(INTERACTIONS_TIMELINE),
  });

  return {
    activities: activitiesQuery.data?.activities ?? [],
    contacts: contactsQuery.data?.contacts ?? [],

    isLoading: contactsQuery.isLoading || activitiesQuery.isLoading,
  };
}

export function useRecentlyAddedContactsQuery() {
  const listParams = { limit: HOME_RECENT_LIMIT, offset: 0, sort: "createdAtDesc" as const };

  return useQuery({
    queryFn: () => getContactsList({ ...listParams, avatarPreset: "small" }),
    queryKey: contactKeys.list(listParams),

    select: (data) => data.contacts,
  });
}

export function useRecentlyInteractedContactsQuery() {
  const listParams = { limit: HOME_RECENT_LIMIT, offset: 0, sort: "interactionDesc" as const };

  return useQuery({
    queryFn: () => getContactsList({ ...listParams, avatarPreset: "small" }),
    queryKey: contactKeys.list(listParams),

    select: (data) => data.contacts,
  });
}

export function useHasAnyInteractionQuery() {
  return useQuery({
    queryFn: () => getInteractionsList({ limit: 1, offset: 0 }),
    queryKey: interactionKeys.list({ limit: 1, offset: 0 }),

    select: (data) => data.activities.length > 0,
  });
}
