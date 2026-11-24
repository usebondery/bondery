import { v5 as uuidv5 } from "uuid";

/**
 * DNS namespace UUID (RFC 4122) used only to derive
 * {@link BONDERY_IMPORT_REMAP_NAMESPACE}. Do not use this as the remap namespace.
 */
const UUID_NAMESPACE_DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/**
 * Bondery import remap namespace. Stable UUID v5 of `bondery.import.remap` in the
 * DNS namespace. **Never change** — crash+retry and re-import must hit the same PKs.
 */
export const BONDERY_IMPORT_REMAP_NAMESPACE: string = uuidv5(
  "bondery.import.remap",
  UUID_NAMESPACE_DNS,
);

/** Stable snake_case table names matching DB / sync keys where those exist. */
export type ImportRemapTable =
  | "groups"
  | "interaction_participants"
  | "interactions"
  | "people"
  | "people_addresses"
  | "people_education_history"
  | "people_emails"
  | "people_groups"
  | "people_important_dates"
  | "people_linkedin"
  | "people_phones"
  | "people_relationships"
  | "people_socials"
  | "people_tags"
  | "people_work_history"
  | "tags";

export type RemapImportIdInput = {
  sourceId: string;
  table: ImportRemapTable;
  userId: string;
};

/**
 * Deterministic UUID v5 for imported rows.
 *
 * Intentional exception to UUIDv7: the same `(targetUserId, table, sourceId)`
 * must produce the same primary key on crash+retry and re-import. Prisma only
 * injects v7 when `id` is omitted — callers must pass this remapped id.
 *
 * People PKs are global. Always remap; never reuse source ids even when they
 * look unused (cross-tenant skipDuplicates no-op).
 */
export function remapImportId({ userId, table, sourceId }: RemapImportIdInput): string {
  return uuidv5(`${userId}:${table}:${sourceId}`, BONDERY_IMPORT_REMAP_NAMESPACE);
}
