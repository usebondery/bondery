import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";
import { readBoolInt, readNumber, readString, type ShapeRowMessage } from "./read-row";

type ColumnSpec = {
  key: string;
  read: (row: Record<string, unknown>) => unknown;
};

function defaultColumns(keys: string[]): ColumnSpec[] {
  return keys.map((key) => ({
    key,
    read: (row) => readString(row, key),
  }));
}

function applyGenericShapeOp(
  db: SQLiteDatabase,
  table: string,
  columns: ColumnSpec[],
  message: ShapeRowMessage,
): void {
  const { operation, value } = message;
  const id = readString(value, "id");
  if (!id) return;

  if (operation === "delete") {
    db.runSync(`DELETE FROM ${table} WHERE id = ?`, id);
    return;
  }

  const colNames = columns.map((c) => c.key);
  const placeholders = colNames.map(() => "?").join(", ");
  const updates = colNames.map((c) => `${c} = excluded.${c}`).join(", ");
  const values = columns.map((c) => c.read(value)) as SQLiteBindValue[];

  db.runSync(
    `INSERT INTO ${table} (${colNames.join(", ")})
     VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}`,
    ...values,
  );
}

export function applyPeoplePhonesShapeOp(db: SQLiteDatabase, message: ShapeRowMessage): void {
  applyGenericShapeOp(db, "people_phones", [
    { key: "id", read: (r) => readString(r, "id") },
    { key: "person_id", read: (r) => readString(r, "person_id") },
    { key: "user_id", read: (r) => readString(r, "user_id") },
    { key: "type", read: (r) => readString(r, "type") ?? "" },
    { key: "prefix", read: (r) => readString(r, "prefix") ?? "" },
    { key: "value", read: (r) => readString(r, "value") ?? "" },
    { key: "preferred", read: (r) => readBoolInt(r, "preferred") },
    { key: "sort_order", read: (r) => readNumber(r, "sort_order") ?? 0 },
    { key: "created_at", read: (r) => readString(r, "created_at") },
    { key: "updated_at", read: (r) => readString(r, "updated_at") },
  ], message);
}

export function applyPeopleEmailsShapeOp(db: SQLiteDatabase, message: ShapeRowMessage): void {
  applyGenericShapeOp(db, "people_emails", [
    { key: "id", read: (r) => readString(r, "id") },
    { key: "person_id", read: (r) => readString(r, "person_id") },
    { key: "user_id", read: (r) => readString(r, "user_id") },
    { key: "type", read: (r) => readString(r, "type") ?? "" },
    { key: "value", read: (r) => readString(r, "value") ?? "" },
    { key: "preferred", read: (r) => readBoolInt(r, "preferred") },
    { key: "sort_order", read: (r) => readNumber(r, "sort_order") ?? 0 },
    { key: "created_at", read: (r) => readString(r, "created_at") },
    { key: "updated_at", read: (r) => readString(r, "updated_at") },
  ], message);
}

export function applyPeopleAddressesShapeOp(db: SQLiteDatabase, message: ShapeRowMessage): void {
  applyGenericShapeOp(db, "people_addresses", defaultColumns([
    "id", "person_id", "user_id", "type", "label", "value", "address_line1", "address_line2",
    "address_city", "address_state", "address_state_code", "address_postal_code",
    "address_country", "address_country_code", "address_formatted", "address_geocode_source",
    "geocode_confidence", "timezone", "created_at", "updated_at",
  ]).concat([
    { key: "sort_order", read: (r) => readNumber(r, "sort_order") ?? 0 },
    { key: "address_granularity", read: (r) => readString(r, "address_granularity") ?? "unknown" },
    { key: "latitude", read: (r) => readNumber(r, "latitude") },
    { key: "longitude", read: (r) => readNumber(r, "longitude") },
  ]), message);
}

export function applyPeopleSocialsShapeOp(db: SQLiteDatabase, message: ShapeRowMessage): void {
  applyGenericShapeOp(db, "people_socials", defaultColumns([
    "id", "person_id", "user_id", "platform", "handle", "connected_at", "created_at", "updated_at",
  ]), message);
}

export function applyGroupsShapeOp(db: SQLiteDatabase, message: ShapeRowMessage): void {
  applyGenericShapeOp(db, "groups", [
    { key: "id", read: (r) => readString(r, "id") },
    { key: "user_id", read: (r) => readString(r, "user_id") },
    { key: "label", read: (r) => readString(r, "label") ?? "" },
    { key: "emoji", read: (r) => readString(r, "emoji") },
    { key: "color", read: (r) => readString(r, "color") },
    { key: "created_at", read: (r) => readString(r, "created_at") },
    { key: "updated_at", read: (r) => readString(r, "updated_at") },
    { key: "is_pending", read: () => 0 },
  ], message);
}

export function applyPeopleGroupsShapeOp(db: SQLiteDatabase, message: ShapeRowMessage): void {
  applyGenericShapeOp(db, "people_groups", defaultColumns([
    "id", "person_id", "group_id", "user_id", "created_at",
  ]), message);
}

export function applyTagsShapeOp(db: SQLiteDatabase, message: ShapeRowMessage): void {
  applyGenericShapeOp(db, "tags", [
    { key: "id", read: (r) => readString(r, "id") },
    { key: "user_id", read: (r) => readString(r, "user_id") },
    { key: "label", read: (r) => readString(r, "label") ?? "" },
    { key: "color", read: (r) => readString(r, "color") },
    { key: "created_at", read: (r) => readString(r, "created_at") },
    { key: "updated_at", read: (r) => readString(r, "updated_at") },
    { key: "is_pending", read: () => 0 },
  ], message);
}

export function applyPeopleTagsShapeOp(db: SQLiteDatabase, message: ShapeRowMessage): void {
  applyGenericShapeOp(db, "people_tags", defaultColumns([
    "id", "person_id", "tag_id", "user_id", "created_at",
  ]), message);
}

export function applyPeopleImportantDatesShapeOp(db: SQLiteDatabase, message: ShapeRowMessage): void {
  applyGenericShapeOp(db, "people_important_dates", [
    { key: "id", read: (r) => readString(r, "id") },
    { key: "person_id", read: (r) => readString(r, "person_id") },
    { key: "user_id", read: (r) => readString(r, "user_id") },
    { key: "type", read: (r) => readString(r, "type") ?? "" },
    { key: "date", read: (r) => readString(r, "date") ?? "" },
    { key: "note", read: (r) => readString(r, "note") },
    { key: "notify_days_before", read: (r) => readNumber(r, "notify_days_before") },
    { key: "notify_on", read: (r) => readString(r, "notify_on") },
    { key: "created_at", read: (r) => readString(r, "created_at") },
    { key: "updated_at", read: (r) => readString(r, "updated_at") },
  ], message);
}
