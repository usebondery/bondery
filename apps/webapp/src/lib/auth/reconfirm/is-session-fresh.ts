/**
 * Matches API / Better Auth `session.freshAge`. Cookie `updateAge` does not
 * reset `createdAt`.
 */
export const SESSION_FRESH_AGE_SECONDS = 60 * 60 * 24;

export function isSessionCreatedAtFresh(
  createdAt: Date | string | undefined,
  nowMs = Date.now(),
  freshAgeSeconds = SESSION_FRESH_AGE_SECONDS,
): boolean {
  if (createdAt == null) {
    return false;
  }

  const createdMs = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
  if (Number.isNaN(createdMs)) {
    return false;
  }

  return nowMs - createdMs <= freshAgeSeconds * 1000;
}
