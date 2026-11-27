import type { PrismaClient } from "@bondery/db";
import { isValidUuid } from "@bondery/helpers/ids";
import logger from "../platform/logger.js";

/** Change-log rows read per chunk. One sequence holds at most 20 rows, so a page spans many. */
const LOG_PAGE_SIZE = 5000;

const PEOPLE_LOG_TABLES = [
  "people",
  "people_phones",
  "people_emails",
  "people_addresses",
  "people_socials",
  "people_important_dates",
] as const;

interface LogRow {
  change_index: number;
  entity_id: string;
  person_id: string | null;
  server_sequence: bigint;
  table_name: string;
}

interface LogGroup {
  personIds: Set<string>;
  sequence: bigint;
}

/** What one chunk takes from the change log. */
interface LogChunk {
  /** True when no sequence up to the head is left. */
  exhausted: boolean;
  personIds: string[];
  /** Highest sequence the chunk fully covers. */
  processedThrough: bigint;
}

function rowKey(table: string, entityId: string): string {
  return `${table}:${entityId}`;
}

function personIdOfRow(row: LogRow, resolved: Map<string, string>): string | null {
  const candidate =
    row.table_name === "people"
      ? row.entity_id
      : (row.person_id ?? resolved.get(rowKey(row.table_name, row.entity_id)) ?? null);
  return isValidUuid(candidate) ? candidate : null;
}

/**
 * Child deletes carry no `row_data` (the column holds JSON `null`, so the lookup tests for
 * `person_id` instead of SQL `NOT NULL`). Their person id comes from the latest earlier log row
 * of the same entity that has data. When none exists (for example the log was pruned), the
 * delete is logged and skipped: the nightly repair finds the stale card.
 */
async function resolveChildDeletes(
  tx: PrismaClient,
  userId: string,
  rows: LogRow[],
): Promise<Map<string, string>> {
  const unresolved = rows.filter((row) => row.table_name !== "people" && row.person_id === null);
  const resolved = new Map<string, string>();
  if (unresolved.length === 0) {
    return resolved;
  }

  const tables = unresolved.map((row) => row.table_name);
  const entityIds = unresolved.map((row) => row.entity_id);
  const found = await tx.$queryRaw<
    { entity_id: string; person_id: string | null; table_name: string }[]
  >`
    SELECT DISTINCT ON (l.table_name, l.entity_id)
           l.table_name, l.entity_id, l.row_data->>'person_id' AS person_id
    FROM sync_change_log l
    JOIN unnest(${tables}::text[], ${entityIds}::text[]) AS wanted(table_name, entity_id)
      ON wanted.table_name = l.table_name AND wanted.entity_id = l.entity_id
    WHERE l.user_id = ${userId}::uuid AND l.row_data->>'person_id' IS NOT NULL
    ORDER BY l.table_name, l.entity_id, l.server_sequence DESC, l.change_index DESC
  `;
  for (const row of found) {
    if (row.person_id) {
      resolved.set(rowKey(row.table_name, row.entity_id), row.person_id);
    }
  }

  for (const row of unresolved) {
    if (!resolved.has(rowKey(row.table_name, row.entity_id))) {
      logger.warn(
        { entityId: row.entity_id, table: row.table_name },
        "carddav.reconcile.child_delete_unresolved",
      );
    }
  }
  return resolved;
}

/**
 * Groups log rows by sequence and resolves the person of each row. A page that ended on a
 * full read may cut its last sequence short, so that group is dropped and the next chunk
 * reads it whole.
 */
async function groupBySequence(
  tx: PrismaClient,
  userId: string,
  rows: LogRow[],
): Promise<LogGroup[]> {
  const resolved = await resolveChildDeletes(tx, userId, rows);
  const groups: LogGroup[] = [];
  for (const row of rows) {
    let group = groups.at(-1);
    if (!group || group.sequence !== row.server_sequence) {
      group = { personIds: new Set(), sequence: row.server_sequence };
      groups.push(group);
    }
    const personId = personIdOfRow(row, resolved);
    if (personId) {
      group.personIds.add(personId);
    }
  }
  if (rows.length === LOG_PAGE_SIZE && groups.length > 1) {
    groups.pop();
  }
  return groups;
}

/**
 * Takes whole sequences while the distinct persons stay within `limit`. The first sequence is
 * always taken, so a small limit still makes progress.
 */
function takeGroups(
  groups: LogGroup[],
  limit: number,
): { accepted: LogGroup[]; allTaken: boolean; personIds: Set<string> } {
  const personIds = new Set<string>();
  const accepted: LogGroup[] = [];
  for (const group of groups) {
    const merged = new Set([...personIds, ...group.personIds]);
    if (accepted.length > 0 && merged.size > limit) {
      return { accepted, allTaken: false, personIds };
    }
    for (const id of group.personIds) {
      personIds.add(id);
    }
    accepted.push(group);
  }
  return { accepted, allTaken: true, personIds };
}

/**
 * Reads the people-table changes after `after` up to `head` and takes whole sequences while the
 * distinct persons stay within `limit`.
 *
 * @param after The watermark: the highest sequence already folded in.
 * @param head Highest committed sequence of the user, read by the caller.
 */
async function readLogChunk(
  tx: PrismaClient,
  userId: string,
  range: { after: bigint; head: bigint },
  limit: number,
): Promise<LogChunk> {
  const rows = await tx.$queryRaw<LogRow[]>`
    SELECT server_sequence, change_index, table_name, entity_id,
           row_data->>'person_id' AS person_id
    FROM sync_change_log
    WHERE user_id = ${userId}::uuid
      AND server_sequence > ${range.after}::bigint
      AND server_sequence <= ${range.head}::bigint
      AND table_name = ANY(${[...PEOPLE_LOG_TABLES]}::text[])
    ORDER BY server_sequence, change_index
    LIMIT ${LOG_PAGE_SIZE}
  `;

  const groups = await groupBySequence(tx, userId, rows);
  const { accepted, allTaken, personIds } = takeGroups(groups, limit);
  const exhausted = allTaken && rows.length < LOG_PAGE_SIZE;
  return {
    exhausted,
    personIds: [...personIds],
    processedThrough: exhausted ? range.head : (accepted.at(-1)?.sequence ?? range.after),
  };
}

export type { LogChunk };
export { readLogChunk };
