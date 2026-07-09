import { z } from "zod";
import { SYNC_TABLE_KEYS, type SyncTableKey } from "#sync/tables.js";

export const SYNC_WS_PROTOCOL_VERSION = 1 as const;

export const syncTableKeySchema = z.enum(SYNC_TABLE_KEYS as [SyncTableKey, ...SyncTableKey[]]);

export const syncEmitMetaSchema = z.object({
  sourceDeviceId: z.string().uuid().optional(),
});

export type SyncEmitMeta = z.infer<typeof syncEmitMetaSchema>;

export const syncWsHelloSchema = z.object({
  serverSequence: z.number().int().nonnegative(),
  type: z.literal("sync.hello"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
});

export const syncWsBatchSchema = z.object({
  affectedTables: z.array(syncTableKeySchema).min(1),
  serverSequence: z.number().int().positive(),
  sourceDeviceId: z.string().uuid().optional(),
  type: z.literal("sync.batch"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
});

export const syncWsPingSchema = z.object({
  type: z.literal("ping"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
});

export const syncWsServerMessageSchema = z.discriminatedUnion("type", [
  syncWsHelloSchema,
  syncWsBatchSchema,
  syncWsPingSchema,
]);

export type SyncWsHelloMessage = z.infer<typeof syncWsHelloSchema>;
export type SyncWsBatchMessage = z.infer<typeof syncWsBatchSchema>;
export type SyncWsPingMessage = z.infer<typeof syncWsPingSchema>;
export type SyncWsServerMessage = z.infer<typeof syncWsServerMessageSchema>;

export const syncWsPongSchema = z.object({
  type: z.literal("pong"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
});

export type SyncWsClientMessage = z.infer<typeof syncWsPongSchema>;

/** Internal wake event published from emitSyncBatch before WS framing. */
export type SyncWakeEvent = {
  serverSequence: number;
  affectedTables: SyncTableKey[];
  sourceDeviceId?: string;
};

export const syncWsTicketResponseSchema = z.object({
  expiresAt: z.number().int().positive(),
  ticket: z.string().min(1),
});

export type SyncWsTicketResponse = z.infer<typeof syncWsTicketResponseSchema>;

export function parseSyncWsServerMessage(raw: unknown): SyncWsServerMessage | null {
  const parsed = syncWsServerMessageSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseSyncWsClientMessage(raw: unknown): SyncWsClientMessage | null {
  const parsed = syncWsPongSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function buildSyncWsUrl(apiBaseUrl: string, ticket: string): string {
  const base = apiBaseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  const wsBase = base.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
  const path = "/api/sync/ws";
  const url = new URL(`${wsBase}${path}`);
  url.searchParams.set("ticket", ticket);
  return url.toString();
}

export function toSyncWsBatchMessage(event: SyncWakeEvent): SyncWsBatchMessage {
  return {
    affectedTables: event.affectedTables,
    serverSequence: event.serverSequence,
    type: "sync.batch",
    v: SYNC_WS_PROTOCOL_VERSION,
    ...(event.sourceDeviceId ? { sourceDeviceId: event.sourceDeviceId } : {}),
  };
}

export function toSyncWsHelloMessage(serverSequence: number): SyncWsHelloMessage {
  return {
    serverSequence,
    type: "sync.hello",
    v: SYNC_WS_PROTOCOL_VERSION,
  };
}

export function toSyncWsPingMessage(): SyncWsPingMessage {
  return {
    type: "ping",
    v: SYNC_WS_PROTOCOL_VERSION,
  };
}
