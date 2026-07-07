import type { SyncTableKey } from "@bondery/schemas/sync";

const CONTACT_TABLES = new Set<SyncTableKey>([
  "people",
  "people_phones",
  "people_emails",
  "people_addresses",
  "people_socials",
  "people_important_dates",
  "people_tags",
]);

const GROUP_TABLES = new Set<SyncTableKey>(["groups", "people_groups"]);
const TAG_TABLES = new Set<SyncTableKey>(["tags", "people_tags"]);

export function affectedTablesTouchContacts(tables: SyncTableKey[]): boolean {
  return tables.some((table) => CONTACT_TABLES.has(table));
}

export function affectedTablesTouchGroups(tables: SyncTableKey[]): boolean {
  return tables.some((table) => GROUP_TABLES.has(table));
}

export function affectedTablesTouchTags(tables: SyncTableKey[]): boolean {
  return tables.some((table) => TAG_TABLES.has(table));
}
