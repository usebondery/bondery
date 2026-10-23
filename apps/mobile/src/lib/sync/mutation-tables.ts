import type { SyncMutationType, SyncTableKey } from "@bondery/schemas/sync";

const CONTACT_CHANNEL_TABLES = [
  "people",
  "people_addresses",
  "people_emails",
  "people_phones",
  "people_socials",
] as const satisfies readonly SyncTableKey[];

const MUTATION_TABLES = {
  "contact.addTag": ["people_tags"],
  "contact.create": CONTACT_CHANNEL_TABLES,
  "contact.delete": [
    ...CONTACT_CHANNEL_TABLES,
    "people_groups",
    "people_important_dates",
    "people_tags",
  ],
  "contact.removeTag": ["people_tags"],
  "contact.replaceImportantDates": ["people_important_dates"],
  "contact.update": CONTACT_CHANNEL_TABLES,
  "group.addMembers": ["people_groups"],
  "group.create": ["groups"],
  "group.delete": ["groups", "people_groups"],
  "group.removeMembers": ["people_groups"],
  "group.update": ["groups"],
  "tag.create": ["tags"],
  "tag.delete": ["tags", "people_tags"],
  "tag.update": ["tags"],
} as const satisfies Record<SyncMutationType, readonly SyncTableKey[]>;

export function getSyncMutationTables(type: SyncMutationType): readonly SyncTableKey[] {
  return MUTATION_TABLES[type];
}
