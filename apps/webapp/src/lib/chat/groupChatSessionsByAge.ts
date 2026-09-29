const DAY_MS = 24 * 60 * 60 * 1000;
const LAST_30_DAYS_MS = 30 * DAY_MS;

export const CHAT_SESSION_GROUP_IDS = ["last30Days", "older"] as const;

export type ChatSessionGroupId = (typeof CHAT_SESSION_GROUP_IDS)[number];

export type ChatSessionAgeGroup<T> = {
  id: ChatSessionGroupId;
  sessions: T[];
};

/**
 * Partitions sessions by `updatedAt` relative to `now`.
 * Empty buckets are omitted. Order within each group matches the input.
 */
export function groupChatSessionsByAge<T extends { updatedAt: string }>(
  sessions: T[],
  now: Date = new Date(),
): ChatSessionAgeGroup<T>[] {
  const cutoff = now.getTime() - LAST_30_DAYS_MS;
  const last30Days: T[] = [];
  const older: T[] = [];

  for (const session of sessions) {
    if (new Date(session.updatedAt).getTime() >= cutoff) {
      last30Days.push(session);
    } else {
      older.push(session);
    }
  }

  const groups: ChatSessionAgeGroup<T>[] = [];
  if (last30Days.length > 0) {
    groups.push({ id: "last30Days", sessions: last30Days });
  }
  if (older.length > 0) {
    groups.push({ id: "older", sessions: older });
  }
  return groups;
}
