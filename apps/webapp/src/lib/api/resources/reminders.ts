import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { UpcomingReminder } from "@bondery/schemas";
import { buildAvatarQueryString } from "@/lib/contacts/avatarParams";

export const UPCOMING_REMINDERS_API_PATH = `${API_ROUTES.CONTACTS_UPCOMING_REMINDERS}?${buildAvatarQueryString("medium")}`;

export type UpcomingRemindersApiResponse = { reminders?: UpcomingReminder[] };

export function parseUpcomingReminders(raw: UpcomingRemindersApiResponse): UpcomingReminder[] {
  return raw.reminders ?? [];
}
