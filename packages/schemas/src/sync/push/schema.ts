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
  deviceId: z.string().uuid().describe("Device that sent these mutations"),
  mutations: z
    .array(syncMutationSchema)
    .min(1)
    .max(50)
    .describe("Mutations to apply, in client sequence order"),
});

export const writeResultSchema: z.ZodType<WriteResult> = z.object({
  serverSequence: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Server sequence assigned to this write"),
  txid: z.string().describe("Sync transaction identifier for this write"),
});

export const syncPushAppliedResultSchema = z.object({
  data: z.unknown().describe("Server record after the write"),
  id: z.string().uuid().describe("Mutation identifier"),
  serverSequence: z.number().int().positive().describe("Server sequence assigned to this write"),
  status: z.literal("applied").describe("Mutation result status"),
  txid: z.string().describe("Sync transaction identifier for this write"),
});

export const syncPushDuplicateResultSchema = z.object({
  data: z.unknown().optional().describe("Server record already stored for this mutation"),
  id: z.string().uuid().describe("Mutation identifier"),
  serverSequence: z.number().int().positive().describe("Server sequence of the stored write"),
  status: z.literal("duplicate").describe("Mutation result status"),
  txid: z.string().optional().describe("Sync transaction identifier for this write"),
});

export const syncPushConflictResultSchema = z.object({
  error: z.string().optional().describe("Conflict message"),
  id: z.string().uuid().describe("Mutation identifier"),
  server: z.unknown().describe("Current server record that caused the conflict"),
  status: z.literal("conflict").describe("Mutation result status"),
  txid: z.string().optional().describe("Sync transaction identifier for this write"),
});

export const syncPushRejectedResultSchema = z.object({
  code: z.string().optional().describe("Machine-readable rejection code"),
  error: z.string().describe("Rejection message"),
  id: z.string().uuid().describe("Mutation identifier"),
  status: z.literal("rejected").describe("Mutation result status"),
});

export const syncPushResultSchema: z.ZodType<SyncPushResult> = z.discriminatedUnion("status", [
  syncPushAppliedResultSchema,
  syncPushDuplicateResultSchema,
  syncPushConflictResultSchema,
  syncPushRejectedResultSchema,
]);

export const syncPushResponseSchema: z.ZodType<SyncPushResponse> = z.object({
  nextServerSequence: z
    .number()
    .int()
    .nonnegative()
    .describe("Next server sequence the client should pull from"),
  results: z.array(syncPushResultSchema).describe("Per-mutation results, in request order"),
  serverTime: createdAtSchema.describe("Server time when this push completed"),
});

export const syncContactWriteDataSchema: z.ZodType<SyncContactWriteData> = z.object({
  contact: contactSchema.describe("Contact record"),
});
export const syncGroupWriteDataSchema: z.ZodType<SyncGroupWriteData> = z.object({
  group: groupSchema.describe("Group record"),
});
export const syncTagWriteDataSchema: z.ZodType<SyncTagWriteData> = z.object({
  tag: tagSchema.describe("Tag record"),
});
export const syncMembershipWriteDataSchema: z.ZodType<SyncMembershipWriteData> = z.object({
  addedCount: z.number().int().nonnegative().optional().describe("Number of members added"),
  removedCount: z.number().int().nonnegative().optional().describe("Number of members removed"),
  skippedCount: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Number of members already in the collection"),
});
