import {
  SYNC_TABLE_KEYS,
  type SyncBatch,
  type SyncChange,
  type SyncTableKey,
} from "@bondery/schemas/sync";
import type { SQLiteDatabase } from "expo-sqlite";
import { getSyncDatabase } from "../db";
import { collectAppliedSyncTables } from "./applied-tables";
import { applyPeopleShapeOp } from "./people";
import type { ShapeRowMessage } from "./read-row";
import {
  applyGroupsShapeOp,
  applyPeopleAddressesShapeOp,
  applyPeopleEmailsShapeOp,
  applyPeopleGroupsShapeOp,
  applyPeopleImportantDatesShapeOp,
  applyPeoplePhonesShapeOp,
  applyPeopleSocialsShapeOp,
  applyPeopleTagsShapeOp,
  applyTagsShapeOp,
} from "./tables";

export type SyncShapeKey = SyncTableKey;

const MATERIALIZERS: Record<SyncShapeKey, (db: SQLiteDatabase, message: ShapeRowMessage) => void> =
  {
    groups: applyGroupsShapeOp,
    people: applyPeopleShapeOp,
    people_addresses: applyPeopleAddressesShapeOp,
    people_emails: applyPeopleEmailsShapeOp,
    people_groups: applyPeopleGroupsShapeOp,
    people_important_dates: applyPeopleImportantDatesShapeOp,
    people_phones: applyPeoplePhonesShapeOp,
    people_socials: applyPeopleSocialsShapeOp,
    people_tags: applyPeopleTagsShapeOp,
    tags: applyTagsShapeOp,
  };

export const ALL_SYNC_TABLE_KEYS = [...SYNC_TABLE_KEYS];

export type MaterializerResult = {
  hadChanges: boolean;
  tables: SyncTableKey[];
};

function applyChange(db: SQLiteDatabase, change: SyncChange): SyncTableKey | null {
  const table = change.table as SyncShapeKey;
  const materializer = MATERIALIZERS[table];
  if (!materializer) {
    return null;
  }

  const operation =
    change.operation === "insert" ? "insert" : change.operation === "delete" ? "delete" : "update";

  materializer(db, {
    operation,
    value: (change.value ?? { id: change.entityId }) as Record<string, unknown>,
  });
  return table;
}

export function applySyncBatch(batch: SyncBatch): MaterializerResult {
  const db = getSyncDatabase();
  const tables = new Set<SyncTableKey>();

  db.withTransactionSync(() => {
    for (const change of batch.changes) {
      const table = applyChange(db, change);
      if (table) {
        tables.add(table);
      }
    }
  });

  return { hadChanges: tables.size > 0, tables: Array.from(tables) };
}

export function applySyncBatches(batches: SyncBatch[]): MaterializerResult {
  let hadChanges = false;
  for (const batch of batches) {
    const result = applySyncBatch(batch);
    if (result.hadChanges) {
      hadChanges = true;
    }
  }
  return { hadChanges, tables: collectAppliedSyncTables(batches) };
}

export function applyBootstrapTables(
  tables: Partial<Record<SyncTableKey, Record<string, unknown>[]>>,
): MaterializerResult {
  const db = getSyncDatabase();
  let hadChanges = false;

  db.withTransactionSync(() => {
    for (const tableKey of ALL_SYNC_TABLE_KEYS) {
      const rows = tables[tableKey] ?? [];
      const materializer = MATERIALIZERS[tableKey];
      for (const row of rows) {
        materializer(db, { operation: "insert", value: row });
        hadChanges = true;
      }
    }
  });

  return { hadChanges, tables: [...ALL_SYNC_TABLE_KEYS] };
}

export { collectAppliedSyncTables } from "./applied-tables";
export { applyPeopleShapeOp } from "./people";
