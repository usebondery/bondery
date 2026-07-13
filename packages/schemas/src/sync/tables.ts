/** Tier-1 tables replicated to mobile SQLite via pull/bootstrap. */
export const SYNC_TABLES = {
  groups: "groups",
  people: "people",
  people_addresses: "people_addresses",
  people_emails: "people_emails",
  people_groups: "people_groups",
  people_important_dates: "people_important_dates",
  people_phones: "people_phones",
  people_socials: "people_socials",
  people_tags: "people_tags",
  tags: "tags",
} as const;

export type SyncTableKey = keyof typeof SYNC_TABLES;

export const SYNC_TABLE_KEYS = Object.keys(SYNC_TABLES) as SyncTableKey[];

export function isSyncTableKey(value: string): value is SyncTableKey {
  return value in SYNC_TABLES;
}
