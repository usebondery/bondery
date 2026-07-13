"use client";

import { useQuery } from "@tanstack/react-query";
import { getUpcomingReminders } from "@/lib/api/domains/reminders";
import { reminderKeys } from "@/lib/query/keys";

export function useUpcomingRemindersQuery() {
  return useQuery({
    queryFn: getUpcomingReminders,
    queryKey: reminderKeys.upcoming(),
  });
}
