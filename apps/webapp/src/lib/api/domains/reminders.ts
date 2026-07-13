import type { UpcomingReminder } from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
import {
  parseUpcomingReminders,
  UPCOMING_REMINDERS_API_PATH,
  type UpcomingRemindersApiResponse,
} from "@/lib/api/resources/reminders";

export async function getUpcomingReminders(): Promise<UpcomingReminder[]> {
  const raw = await clientApiJson<UpcomingRemindersApiResponse>(UPCOMING_REMINDERS_API_PATH);
  return parseUpcomingReminders(raw);
}
