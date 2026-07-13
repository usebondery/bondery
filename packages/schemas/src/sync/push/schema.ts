import { z } from "zod";
import { createdAtSchema } from "#entities/_shared/index.js";
import { contactSchema } from "#entities/contact/index.js";
import { groupSchema } from "#entities/group/index.js";
import { tagSchema } from "#entities/tag/index.js";
import { syncMutationSchema } from "#sync/mutations/schema.js";
import type {
  SyncContactWriteData,
  SyncGroupWriteData,
  SyncMembershipWriteData,
  SyncPushRequest,
  SyncPushResponse,
  SyncPushResult,
  SyncTagWriteData,
  WriteResult,
} from "./types.js";

export const syncPushRequestSchema: z.ZodType<SyncPushRequest> = z.object({
  deviceId: z.string().uuid(),
  mutations: z.array(syncMutationSchema).min(1).max(50),
});

export const writeResultSchema: z.ZodType<WriteResult> = z.object({
  serverSequence: z.number().int().positive().optional(),
  txid: z.string(),
});

export const syncPushAppliedResultSchema = z.object({
  data: z.unknown(),
  id: z.string().uuid(),
  serverSequence: z.number().int().positive(),
  status: z.literal("applied"),
  txid: z.string(),
});

export const syncPushDuplicateResultSchema = z.object({
  data: z.unknown().optional(),
  id: z.string().uuid(),
  serverSequence: z.number().int().positive(),
  status: z.literal("duplicate"),
  txid: z.string().optional(),
});

export const syncPushConflictResultSchema = z.object({
  error: z.string().optional(),
  id: z.string().uuid(),
  server: z.unknown(),
  status: z.literal("conflict"),
  txid: z.string().optional(),
});

export const syncPushRejectedResultSchema = z.object({
  error: z.string(),
  id: z.string().uuid(),
  status: z.literal("rejected"),
});

export const syncPushResultSchema: z.ZodType<SyncPushResult> = z.discriminatedUnion("status", [
  syncPushAppliedResultSchema,
  syncPushDuplicateResultSchema,
  syncPushConflictResultSchema,
  syncPushRejectedResultSchema,
]);

export const syncPushResponseSchema: z.ZodType<SyncPushResponse> = z.object({
  nextServerSequence: z.number().int().nonnegative(),
  results: z.array(syncPushResultSchema),
  serverTime: createdAtSchema,
});

export const syncContactWriteDataSchema: z.ZodType<SyncContactWriteData> = z.object({
  contact: contactSchema,
});
export const syncGroupWriteDataSchema: z.ZodType<SyncGroupWriteData> = z.object({
  group: groupSchema,
});
export const syncTagWriteDataSchema: z.ZodType<SyncTagWriteData> = z.object({ tag: tagSchema });
export const syncMembershipWriteDataSchema: z.ZodType<SyncMembershipWriteData> = z.object({
  addedCount: z.number().int().nonnegative().optional(),
  removedCount: z.number().int().nonnegative().optional(),
  skippedCount: z.number().int().nonnegative().optional(),
});
