import "server-only";

import type { UpcomingReminder } from "@bondery/schemas";
import {
  parseUpcomingReminders,
  UPCOMING_REMINDERS_API_PATH,
  type UpcomingRemindersApiResponse,
} from "@/lib/api/resources/reminders";
import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";

type ReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const REMINDERS_TAG = { next: { tags: ["reminders", "contacts"] } } satisfies ServerApiFetchOptions;

export async function getUpcomingRemindersServer(
  options: ReadOptions = {},
): Promise<UpcomingReminder[]> {
  const raw = await serverApiJson<UpcomingRemindersApiResponse>(
    UPCOMING_REMINDERS_API_PATH,
    undefined,
    { ...REMINDERS_TAG, ...options },
  );
  return parseUpcomingReminders(raw);
}
