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
  sourceDeviceId: z.string().uuid().optional(),
}) satisfies z.ZodType<SyncEmitMeta>;

export const syncWsHelloSchema = z.object({
  serverSequence: z.number().int().nonnegative(),
  type: z.literal("sync.hello"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
}) satisfies z.ZodType<SyncWsHelloMessage>;

export const syncWsBatchSchema = z.object({
  affectedTables: z.array(syncTableKeySchema).min(1),
  serverSequence: z.number().int().positive(),
  sourceDeviceId: z.string().uuid().optional(),
  type: z.literal("sync.batch"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
}) satisfies z.ZodType<SyncWsBatchMessage>;

export const syncWsPingSchema = z.object({
  type: z.literal("ping"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
}) satisfies z.ZodType<SyncWsPingMessage>;

export const syncWsServerMessageSchema = z.discriminatedUnion("type", [
  syncWsHelloSchema,
  syncWsBatchSchema,
  syncWsPingSchema,
]);

export const syncWsPongSchema = z.object({
  type: z.literal("pong"),
  v: z.literal(SYNC_WS_PROTOCOL_VERSION),
}) satisfies z.ZodType<SyncWsClientMessage>;

export const syncWsTicketResponseSchema = z.object({
  expiresAt: z.number().int().positive(),
  ticket: z.string().min(1),
}) satisfies z.ZodType<SyncWsTicketResponse>;
