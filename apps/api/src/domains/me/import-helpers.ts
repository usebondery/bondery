import type { PrismaClient } from "@bondery/db";
import type { ImportTypeResult } from "@bondery/schemas";
import type { SyncChange } from "@bondery/schemas/sync";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import type { DomainContext } from "../_shared/context.js";
import { syncEmitMetaFromContext } from "../_shared/context.js";

const WRITE_CHUNK_SIZE = 500;
const SYNC_EMIT_CHUNK_SIZE = 20;

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) {
    return [];
  }
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function asDate(value: string): Date {
  return new Date(value);
}

export function asDateOrNull(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

export function typeResult(
  attempted: number,
  inserted: number,
  extraSkipped = 0,
): ImportTypeResult {
  return { inserted, skipped: attempted - inserted + extraSkipped };
}

export function isValidLatLng(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export async function createManyCounted<T>(
  rows: T[],
  write: (chunk: T[]) => Promise<{ count: number }>,
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }
  let inserted = 0;
  for (const chunk of chunkArray(rows, WRITE_CHUNK_SIZE)) {
    const result = await write(chunk);
    inserted += result.count;
  }
  return inserted;
}

export async function createManyReturning<T, R>(
  rows: T[],
  write: (chunk: T[]) => Promise<R[]>,
): Promise<R[]> {
  if (rows.length === 0) {
    return [];
  }
  const created: R[] = [];
  for (const chunk of chunkArray(rows, WRITE_CHUNK_SIZE)) {
    created.push(...(await write(chunk)));
  }
  return created;
}

export async function setGisPoint(
  db: PrismaClient,
  table: "people" | "people_addresses",
  id: string,
  userId: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  const ewkt = `SRID=4326;POINT(${longitude} ${latitude})`;
  if (table === "people") {
    await db.$executeRaw`
      UPDATE people
      SET "gisPoint" = ST_GeogFromText(${ewkt})
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
    `;
    return;
  }
  await db.$executeRaw`
    UPDATE people_addresses
    SET "gisPoint" = ST_GeogFromText(${ewkt})
    WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
  `;
}

export function upsertChange(table: SyncChange["table"], row: Record<string, unknown>): SyncChange {
  const id = String(row.id);
  return { entityId: id, operation: "update", table, value: row };
}

export async function emitSyncChunks(
  ctx: DomainContext,
  db: PrismaClient,
  changes: SyncChange[],
): Promise<void> {
  for (const chunk of chunkArray(changes, SYNC_EMIT_CHUNK_SIZE)) {
    await emitSyncBatch(ctx.user.id, chunk, syncEmitMetaFromContext(ctx), db);
  }
}
