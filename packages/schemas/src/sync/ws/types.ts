import type { SyncTableKey } from "../tables.js";

export type SyncWsProtocolVersion = 1;

export interface SyncEmitMeta {
  sourceDeviceId?: string;
}

export interface SyncWsHelloMessage {
  serverSequence: number;
  type: "sync.hello";
  v: SyncWsProtocolVersion;
}

export interface SyncWsBatchMessage {
  affectedTables: SyncTableKey[];
  serverSequence: number;
  sourceDeviceId?: string;
  type: "sync.batch";
  v: SyncWsProtocolVersion;
}

export interface SyncWsPingMessage {
  type: "ping";
  v: SyncWsProtocolVersion;
}

export type SyncWsServerMessage = SyncWsHelloMessage | SyncWsBatchMessage | SyncWsPingMessage;

export interface SyncWsPongMessage {
  type: "pong";
  v: SyncWsProtocolVersion;
}

export type SyncWsClientMessage = SyncWsPongMessage;

/** Internal wake event published from emitSyncBatch before WS framing. */
export interface SyncWakeEvent {
  affectedTables: SyncTableKey[];
  serverSequence: number;
  sourceDeviceId?: string;
}

export interface SyncWsTicketResponse {
  expiresAt: number;
  ticket: string;
}
