import { z } from "zod";
import { createdAtSchema } from "#entities/_shared.js";
import { contactSchema } from "#entities/contact.js";
import { groupSchema } from "#entities/group.js";
import { tagSchema } from "#entities/tag.js";
import { syncMutationSchema } from "#sync/mutations.js";

export const syncPushRequestSchema = z.object({
  deviceId: z.string().uuid(),
  mutations: z.array(syncMutationSchema).min(1).max(50),
});
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;

export const writeResultSchema = z.object({
  serverSequence: z.number().int().positive().optional(),
  txid: z.string(),
});

export type WriteResult = z.infer<typeof writeResultSchema>;

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

export const syncPushResultSchema = z.discriminatedUnion("status", [
  syncPushAppliedResultSchema,
  syncPushDuplicateResultSchema,
  syncPushConflictResultSchema,
  syncPushRejectedResultSchema,
]);

export type SyncPushResult = z.infer<typeof syncPushResultSchema>;

export const syncPushResponseSchema = z.object({
  nextServerSequence: z.number().int().nonnegative(),
  results: z.array(syncPushResultSchema),
  serverTime: createdAtSchema,
});
export type SyncPushResponse = z.infer<typeof syncPushResponseSchema>;

export const syncContactWriteDataSchema = z.object({ contact: contactSchema });
export const syncGroupWriteDataSchema = z.object({ group: groupSchema });
export const syncTagWriteDataSchema = z.object({ tag: tagSchema });
export const syncMembershipWriteDataSchema = z.object({
  addedCount: z.number().int().nonnegative().optional(),
  removedCount: z.number().int().nonnegative().optional(),
  skippedCount: z.number().int().nonnegative().optional(),
});
