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

type _SyncPushRequest = Assert<IsEqual<SyncPushRequest, z.infer<typeof syncPushRequestSchema>>>;
type _WriteResult = Assert<IsEqual<WriteResult, z.infer<typeof writeResultSchema>>>;
type _SyncPushResult = Assert<IsEqual<SyncPushResult, z.infer<typeof syncPushResultSchema>>>;
type _SyncPushResponse = Assert<IsEqual<SyncPushResponse, z.infer<typeof syncPushResponseSchema>>>;
type _SyncContactWriteData = Assert<
  IsEqual<SyncContactWriteData, z.infer<typeof syncContactWriteDataSchema>>
>;
type _SyncGroupWriteData = Assert<
  IsEqual<SyncGroupWriteData, z.infer<typeof syncGroupWriteDataSchema>>
>;
type _SyncTagWriteData = Assert<IsEqual<SyncTagWriteData, z.infer<typeof syncTagWriteDataSchema>>>;
type _SyncMembershipWriteData = Assert<
  IsEqual<SyncMembershipWriteData, z.infer<typeof syncMembershipWriteDataSchema>>
>;
