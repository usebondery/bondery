import type { SyncBatch, SyncChange, SyncTableKey } from "@bondery/schemas/sync";
import type { SQLiteDatabase } from "expo-sqlite";
import { getSyncDatabase } from "../db";
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

export const ALL_SYNC_TABLE_KEYS = Object.keys(MATERIALIZERS) as SyncShapeKey[];

function applyChange(db: SQLiteDatabase, change: SyncChange): void {
  const table = change.table as SyncShapeKey;
  const materializer = MATERIALIZERS[table];
  if (!materializer) {
    return;
  }

  const operation =
    change.operation === "insert" ? "insert" : change.operation === "delete" ? "delete" : "update";

  materializer(db, {
    operation,
    value: (change.value ?? { id: change.entityId }) as Record<string, unknown>,
  });
}

export function applySyncBatch(batch: SyncBatch): boolean {
  const db = getSyncDatabase();
  let hadChanges = false;

  db.withTransactionSync(() => {
    for (const change of batch.changes) {
      applyChange(db, change);
      hadChanges = true;
    }
  });

  return hadChanges;
}

export function applySyncBatches(batches: SyncBatch[]): boolean {
  let hadChanges = false;
  for (const batch of batches) {
    if (applySyncBatch(batch)) {
      hadChanges = true;
    }
  }
  return hadChanges;
}

export function applyBootstrapTables(
  tables: Partial<Record<SyncTableKey, Record<string, unknown>[]>>,
): boolean {
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

  return hadChanges;
}

export { applyPeopleShapeOp } from "./people";
