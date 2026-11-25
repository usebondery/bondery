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

type SyncShapeKey = SyncTableKey;

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

const ALL_SYNC_TABLE_KEYS = [...SYNC_TABLE_KEYS];

type MaterializerResult = {
  hadChanges: boolean;
  tables: SyncTableKey[];
};

function applyChange(db: SQLiteDatabase, change: SyncChange): SyncTableKey | null {
  const table = change.table as SyncShapeKey;
  const materializer = MATERIALIZERS[table];
  if (!materializer) {
    return null;
  }

  const resolveOperation = () => {
    if (change.operation === "insert") {
      return "insert";
    }
    if (change.operation === "delete") {
      return "delete";
    }
    return "update";
  };
  const operation = resolveOperation();

  materializer(db, {
    operation,
    value: (change.value ?? { id: change.entityId }) as Record<string, unknown>,
  });
  return table;
}

function applySyncBatch(batch: SyncBatch): MaterializerResult {
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

function applySyncBatches(batches: SyncBatch[]): MaterializerResult {
  let hadChanges = false;
  for (const batch of batches) {
    const result = applySyncBatch(batch);
    if (result.hadChanges) {
      hadChanges = true;
    }
  }
  return { hadChanges, tables: collectAppliedSyncTables(batches) };
}

function applyBootstrapTables(
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
export type { MaterializerResult, SyncShapeKey };
export { ALL_SYNC_TABLE_KEYS, applyBootstrapTables, applySyncBatch, applySyncBatches };
