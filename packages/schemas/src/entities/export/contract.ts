import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  bonderyExportFormatSchema,
  exportCountsSchema,
  exportGroupRecordSchema,
  exportInteractionRecordSchema,
  exportManifestSchema,
  exportMembershipRecordSchema,
  exportPersonRecordSchema,
  exportRelationshipRecordSchema,
  exportSummaryResponseSchema,
  exportSummarySchema,
  exportTagRecordSchema,
  importResultResponseSchema,
  importResultSchema,
  importTypeResultSchema,
} from "./schema.js";
import type {
  BonderyExportFormat,
  ExportCounts,
  ExportGroupRecord,
  ExportInteractionRecord,
  ExportManifest,
  ExportMembershipRecord,
  ExportPersonRecord,
  ExportRelationshipRecord,
  ExportSummary,
  ExportSummaryResponse,
  ExportTagRecord,
  ImportResult,
  ImportResultResponse,
  ImportTypeResult,
} from "./types.js";

export type _BonderyExportFormat = Assert<
  IsEqual<BonderyExportFormat, z.infer<typeof bonderyExportFormatSchema>>
>;
export type _ExportCounts = Assert<IsEqual<ExportCounts, z.infer<typeof exportCountsSchema>>>;
export type _ExportSummary = Assert<IsEqual<ExportSummary, z.infer<typeof exportSummarySchema>>>;
export type _ExportSummaryResponse = Assert<
  IsEqual<ExportSummaryResponse, z.infer<typeof exportSummaryResponseSchema>>
>;
export type _ExportManifest = Assert<IsEqual<ExportManifest, z.infer<typeof exportManifestSchema>>>;
export type _ExportPersonRecord = Assert<
  IsEqual<ExportPersonRecord, z.infer<typeof exportPersonRecordSchema>>
>;
export type _ExportGroupRecord = Assert<
  IsEqual<ExportGroupRecord, z.infer<typeof exportGroupRecordSchema>>
>;
export type _ExportTagRecord = Assert<
  IsEqual<ExportTagRecord, z.infer<typeof exportTagRecordSchema>>
>;
export type _ExportMembershipRecord = Assert<
  IsEqual<ExportMembershipRecord, z.infer<typeof exportMembershipRecordSchema>>
>;
export type _ExportInteractionRecord = Assert<
  IsEqual<ExportInteractionRecord, z.infer<typeof exportInteractionRecordSchema>>
>;
export type _ExportRelationshipRecord = Assert<
  IsEqual<ExportRelationshipRecord, z.infer<typeof exportRelationshipRecordSchema>>
>;
export type _ImportTypeResult = Assert<
  IsEqual<ImportTypeResult, z.infer<typeof importTypeResultSchema>>
>;
export type _ImportResult = Assert<IsEqual<ImportResult, z.infer<typeof importResultSchema>>>;
export type _ImportResultResponse = Assert<
  IsEqual<ImportResultResponse, z.infer<typeof importResultResponseSchema>>
>;
