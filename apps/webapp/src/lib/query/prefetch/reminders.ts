import type { QueryClient } from "@tanstack/react-query";
import { getUpcomingRemindersServer } from "@/lib/api/domains/server/reminders";
import { reminderKeys } from "@/lib/query/keys";

export async function prefetchUpcomingReminders(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getUpcomingRemindersServer(),
    queryKey: reminderKeys.upcoming(),
  });
}
