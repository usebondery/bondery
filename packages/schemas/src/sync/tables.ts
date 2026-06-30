/** Tier-1 tables replicated to mobile SQLite via pull/bootstrap. */
export const SYNC_TABLES = {
  people: "people",
  people_phones: "people_phones",
  people_emails: "people_emails",
  people_addresses: "people_addresses",
  people_socials: "people_socials",
  groups: "groups",
  people_groups: "people_groups",
  tags: "tags",
  people_tags: "people_tags",
  people_important_dates: "people_important_dates",
} as const;

export type SyncTableKey = keyof typeof SYNC_TABLES;

export const SYNC_TABLE_KEYS = Object.keys(SYNC_TABLES) as SyncTableKey[];

export function isSyncTableKey(value: string): value is SyncTableKey {
  return value in SYNC_TABLES;
}
