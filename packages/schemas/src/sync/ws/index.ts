export {
  SYNC_WS_PROTOCOL_VERSION,
  syncEmitMetaSchema,
  syncTableKeySchema,
  syncWsBatchSchema,
  syncWsHelloSchema,
  syncWsPingSchema,
  syncWsPongSchema,
  syncWsServerMessageSchema,
  syncWsTicketResponseSchema,
} from "./schema.js";
export type {
  SyncEmitMeta,
  SyncWakeEvent,
  SyncWsBatchMessage,
  SyncWsClientMessage,
  SyncWsHelloMessage,
  SyncWsPingMessage,
  SyncWsProtocolVersion,
  SyncWsServerMessage,
  SyncWsTicketResponse,
} from "./types.js";

import { SYNC_WS_PROTOCOL_VERSION, syncWsPongSchema, syncWsServerMessageSchema } from "./schema.js";
import type {
  SyncWakeEvent,
  SyncWsBatchMessage,
  SyncWsClientMessage,
  SyncWsHelloMessage,
  SyncWsPingMessage,
  SyncWsServerMessage,
} from "./types.js";

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
