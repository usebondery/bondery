import { z } from "zod";
import { SYNC_TABLE_KEYS, type SyncTableKey } from "#sync/tables.js";
import type {
  SyncEmitMeta,
  SyncWsBatchMessage,
  SyncWsClientMessage,
  SyncWsHelloMessage,
  SyncWsPingMessage,
  SyncWsTicketResponse,
} from "./types.js";

export const SYNC_WS_PROTOCOL_VERSION = 1 as const;

export const syncTableKeySchema = z.enum(SYNC_TABLE_KEYS as [SyncTableKey, ...SyncTableKey[]]);

export const syncEmitMetaSchema = z.object({
  sourceDeviceId: z.string().uuid().optional().describe("Device that produced this change"),
}) satisfies z.ZodType<SyncEmitMeta>;

export const syncWsHelloSchema = z.object({
  serverSequence: z
    .number()
    .int()
    .nonnegative()
    .describe("Current server sequence at connection time"),
  type: z.literal("sync.hello").describe("WebSocket message type"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION).describe("Sync WebSocket protocol version"),
}) satisfies z.ZodType<SyncWsHelloMessage>;

export const syncWsBatchSchema = z.object({
  affectedTables: z.array(syncTableKeySchema).min(1).describe("Tables that changed in this batch"),
  serverSequence: z.number().int().positive().describe("Server sequence of this batch"),
  sourceDeviceId: z.string().uuid().optional().describe("Device that produced this change"),
  type: z.literal("sync.batch").describe("WebSocket message type"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION).describe("Sync WebSocket protocol version"),
}) satisfies z.ZodType<SyncWsBatchMessage>;

export const syncWsPingSchema = z.object({
  type: z.literal("ping").describe("WebSocket message type"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION).describe("Sync WebSocket protocol version"),
}) satisfies z.ZodType<SyncWsPingMessage>;

export const syncWsServerMessageSchema = z.discriminatedUnion("type", [
  syncWsHelloSchema,
  syncWsBatchSchema,
  syncWsPingSchema,
]);

export const syncWsPongSchema = z.object({
  type: z.literal("pong").describe("WebSocket message type"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION).describe("Sync WebSocket protocol version"),
}) satisfies z.ZodType<SyncWsClientMessage>;

export const syncWsTicketResponseSchema = z.object({
  expiresAt: z.number().int().positive().describe("Unix time in seconds when this ticket expires"),
  ticket: z.string().min(1).describe("Short-lived ticket for the sync WebSocket"),
}) satisfies z.ZodType<SyncWsTicketResponse>;
