import type { SyncMutation } from "@bondery/schemas/sync";
import type { SQLiteDatabase } from "expo-sqlite";
import { SYNC_META_KEYS } from "../constants";
import { getSyncDatabase } from "../db";
import { generateUuid, isValidUuid } from "../ids";
import { normalizeSyncDatetime } from "../sync-datetime";

function getMeta(db: SQLiteDatabase, key: string): string | null {
  const row = db.getFirstSync<{ value: string }>("SELECT value FROM sync_meta WHERE key = ?", key);
  return row?.value ?? null;
}

function setMeta(db: SQLiteDatabase, key: string, value: string): void {
  db.runSync(
    "INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}

export async function ensureDeviceId(): Promise<string> {
  const db = getSyncDatabase();
  const existing = getMeta(db, SYNC_META_KEYS.deviceId);
  if (existing && isValidUuid(existing)) {
    return existing;
  }

  const deviceId = generateUuid();
  setMeta(db, SYNC_META_KEYS.deviceId, deviceId);
  return deviceId;
}

export function nextClientSequence(): number {
  const db = getSyncDatabase();
  const currentRaw = getMeta(db, SYNC_META_KEYS.clientSequenceCounter);
  const current = currentRaw ? Number(currentRaw) : 0;
  const next = current + 1;
  setMeta(db, SYNC_META_KEYS.clientSequenceCounter, String(next));
  return next;
}

export function enqueuePendingMutation(mutation: SyncMutation): void {
  const db = getSyncDatabase();
  db.runSync(
    `INSERT INTO pending_mutations (
      id, client_sequence, mutation_type, entity_id, base_updated_at, payload_json, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    mutation.id,
    mutation.clientSequence,
    mutation.type,
    "entityId" in mutation ? (mutation.entityId ?? null) : null,
    normalizeSyncDatetime(mutation.baseUpdatedAt) ?? null,
    JSON.stringify(mutation.payload ?? {}),
    new Date().toISOString(),
  );
}

export function listPendingMutations(limit = 50): SyncMutation[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<{
    id: string;
    client_sequence: number;
    mutation_type: string;
    entity_id: string | null;
    base_updated_at: string | null;
    payload_json: string;
  }>(
    `SELECT id, client_sequence, mutation_type, entity_id, base_updated_at, payload_json
     FROM pending_mutations
     WHERE status = 'pending'
     ORDER BY client_sequence ASC
     LIMIT ?`,
    limit,
  );

  return rows.map((row) => {
    const payload = JSON.parse(row.payload_json) as Record<string, unknown>;
    const baseUpdatedAt = normalizeSyncDatetime(row.base_updated_at);
    const base = {
      clientSequence: row.client_sequence,
      id: row.id,
      ...(baseUpdatedAt ? { baseUpdatedAt } : {}),
      payload,
    };

    if (row.entity_id) {
      return {
        ...base,
        entityId: row.entity_id,
        type: row.mutation_type,
      } as SyncMutation;
    }

    return {
      ...base,
      type: row.mutation_type,
    } as SyncMutation;
  });
}

export function markMutationApplied(mutationId: string): void {
  const db = getSyncDatabase();
  db.runSync("DELETE FROM pending_mutations WHERE id = ?", mutationId);
}

export function markMutationConflict(mutationId: string): void {
  const db = getSyncDatabase();
  db.runSync("UPDATE pending_mutations SET status = 'conflict' WHERE id = ?", mutationId);
}

export function markMutationRejected(mutationId: string, errorMessage: string): void {
  const db = getSyncDatabase();
  db.runSync(
    "UPDATE pending_mutations SET status = 'rejected', error_message = ? WHERE id = ?",
    errorMessage,
    mutationId,
  );
}

export function countPendingMutations(): number {
  const db = getSyncDatabase();
  const row = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM pending_mutations WHERE status = 'pending'",
  );
  return row?.count ?? 0;
}

export function countConflictMutations(): number {
  const db = getSyncDatabase();
  const row = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM pending_mutations WHERE status = 'conflict'",
  );
  return row?.count ?? 0;
}

export function listRejectedMutations(): Array<{ id: string; errorMessage: string | null }> {
  const db = getSyncDatabase();
  return db
    .getAllSync<{ id: string; error_message: string | null }>(
      "SELECT id, error_message FROM pending_mutations WHERE status = 'rejected'",
    )
    .map((row) => ({ errorMessage: row.error_message, id: row.id }));
}

export function setLastServerSequence(value: number): void {
  const db = getSyncDatabase();
  setMeta(db, SYNC_META_KEYS.lastServerSequence, String(value));
}

export function getLastServerSequence(): number {
  const db = getSyncDatabase();
  const raw = getMeta(db, SYNC_META_KEYS.lastServerSequence);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getBootstrapCompleted(): boolean {
  const db = getSyncDatabase();
  return getMeta(db, SYNC_META_KEYS.bootstrapCompleted) === "1";
}

export function setBootstrapCompleted(completed: boolean): void {
  const db = getSyncDatabase();
  setMeta(db, SYNC_META_KEYS.bootstrapCompleted, completed ? "1" : "0");
}
