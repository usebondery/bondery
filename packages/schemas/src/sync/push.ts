import { z } from "zod";
import { contactSchema } from "../entities/contact.js";
import { groupSchema } from "../entities/group.js";
import { tagSchema } from "../entities/tag.js";
import { syncMutationSchema } from "./mutations.js";

export const syncPushRequestSchema = z.object({
  deviceId: z.string().uuid(),
  mutations: z.array(syncMutationSchema).min(1).max(50),
});

export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;

export const writeResultSchema = z.object({
  txid: z.string(),
  serverSequence: z.number().int().positive().optional(),
});

export type WriteResult = z.infer<typeof writeResultSchema>;

export const syncPushAppliedResultSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("applied"),
  serverSequence: z.number().int().positive(),
  txid: z.string(),
  data: z.unknown(),
});

export const syncPushDuplicateResultSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("duplicate"),
  serverSequence: z.number().int().positive(),
  txid: z.string().optional(),
  data: z.unknown().optional(),
});

export const syncPushConflictResultSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("conflict"),
  txid: z.string().optional(),
  server: z.unknown(),
  error: z.string().optional(),
});

export const syncPushRejectedResultSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("rejected"),
  error: z.string(),
});

export const syncPushResultSchema = z.discriminatedUnion("status", [
  syncPushAppliedResultSchema,
  syncPushDuplicateResultSchema,
  syncPushConflictResultSchema,
  syncPushRejectedResultSchema,
]);

export type SyncPushResult = z.infer<typeof syncPushResultSchema>;

export const syncPushResponseSchema = z.object({
  results: z.array(syncPushResultSchema),
  serverTime: z.string().datetime(),
  nextServerSequence: z.number().int().nonnegative(),
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
