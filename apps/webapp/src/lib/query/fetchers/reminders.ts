import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { UpcomingReminder } from "@bondery/schemas";
import { buildAvatarQueryString } from "@/lib/avatarParams";
import { createClientFetcher } from "./createClientFetcher";

export function buildUpcomingRemindersPath(): string {
  return `${API_ROUTES.CONTACTS_UPCOMING_REMINDERS}?${buildAvatarQueryString("medium")}`;
}

export function createUpcomingRemindersQueryFn() {
  const fetch = createClientFetcher();
  const path = buildUpcomingRemindersPath();
  return async (): Promise<UpcomingReminder[]> => {
    const raw = await fetch<{ reminders?: UpcomingReminder[] }>(path);
    return raw.reminders ?? [];
  };
}
