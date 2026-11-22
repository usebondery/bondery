import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  syncContactWriteDataSchema,
  syncGroupWriteDataSchema,
  syncMembershipWriteDataSchema,
  syncPushRequestSchema,
  syncPushResponseSchema,
  syncPushResultSchema,
  syncTagWriteDataSchema,
  writeResultSchema,
} from "./schema.js";
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

export type _SyncPushRequest = Assert<
  IsEqual<SyncPushRequest, z.infer<typeof syncPushRequestSchema>>
>;
export type _WriteResult = Assert<IsEqual<WriteResult, z.infer<typeof writeResultSchema>>>;
export type _SyncPushResult = Assert<IsEqual<SyncPushResult, z.infer<typeof syncPushResultSchema>>>;
export type _SyncPushResponse = Assert<
  IsEqual<SyncPushResponse, z.infer<typeof syncPushResponseSchema>>
>;
export type _SyncContactWriteData = Assert<
  IsEqual<SyncContactWriteData, z.infer<typeof syncContactWriteDataSchema>>
>;
export type _SyncGroupWriteData = Assert<
  IsEqual<SyncGroupWriteData, z.infer<typeof syncGroupWriteDataSchema>>
>;
export type _SyncTagWriteData = Assert<
  IsEqual<SyncTagWriteData, z.infer<typeof syncTagWriteDataSchema>>
>;
export type _SyncMembershipWriteData = Assert<
  IsEqual<SyncMembershipWriteData, z.infer<typeof syncMembershipWriteDataSchema>>
>;
