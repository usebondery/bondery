import { z } from "zod";
import { SYNC_TABLE_KEYS, type SyncTableKey } from "#sync/tables.js";

export const SYNC_WS_PROTOCOL_VERSION = 1 as const;

export const syncTableKeySchema = z.enum(
  SYNC_TABLE_KEYS as [SyncTableKey, ...SyncTableKey[]],
);

export const syncEmitMetaSchema = z.object({
  sourceDeviceId: z.string().uuid().optional(),
});

export type SyncEmitMeta = z.infer<typeof syncEmitMetaSchema>;

export const syncWsHelloSchema = z.object({
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
  type: z.literal("sync.hello"),
  serverSequence: z.number().int().nonnegative(),
});

export const syncWsBatchSchema = z.object({
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
  type: z.literal("sync.batch"),
  serverSequence: z.number().int().positive(),
  affectedTables: z.array(syncTableKeySchema).min(1),
  sourceDeviceId: z.string().uuid().optional(),
});

export const syncWsPingSchema = z.object({
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
  type: z.literal("ping"),
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
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
  type: z.literal("pong"),
});

export type SyncWsClientMessage = z.infer<typeof syncWsPongSchema>;

/** Internal wake event published from emitSyncBatch before WS framing. */
export type SyncWakeEvent = {
  serverSequence: number;
  affectedTables: SyncTableKey[];
  sourceDeviceId?: string;
};

export const syncWsTicketResponseSchema = z.object({
  ticket: z.string().min(1),
  expiresAt: z.number().int().positive(),
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
    v: SYNC_WS_PROTOCOL_VERSION,
    type: "sync.batch",
    serverSequence: event.serverSequence,
    affectedTables: event.affectedTables,
    ...(event.sourceDeviceId ? { sourceDeviceId: event.sourceDeviceId } : {}),
  };
}

export function toSyncWsHelloMessage(serverSequence: number): SyncWsHelloMessage {
  return {
    v: SYNC_WS_PROTOCOL_VERSION,
    type: "sync.hello",
    serverSequence,
  };
}

export function toSyncWsPingMessage(): SyncWsPingMessage {
  return {
    v: SYNC_WS_PROTOCOL_VERSION,
    type: "ping",
  };
}
