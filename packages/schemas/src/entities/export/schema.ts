import { z } from "zod";
import { createdAtSchema, nullableDateTimeSchema } from "../_shared/schema.js";
import type {
  BonderyExportDataSchemaType,
  BonderyExportFormat,
  BonderyExportSchemaType,
  ExportAddressRecord,
  ExportCounts,
  ExportEducationHistoryRecord,
  ExportEmailRecord,
  ExportFileEnvelope,
  ExportGroupRecord,
  ExportImportantDateRecord,
  ExportInteractionRecord,
  ExportLinkedinRecord,
  ExportManifest,
  ExportManifestFileEntry,
  ExportMembershipRecord,
  ExportMyselfFile,
  ExportPersonRecord,
  ExportPhoneRecord,
  ExportRelationshipRecord,
  ExportSocialRecord,
  ExportSummary,
  ExportSummaryResponse,
  ExportTagRecord,
  ExportWorkHistoryRecord,
  ImportResult,
  ImportResultResponse,
  ImportTypeResult,
} from "./types.js";
import {
  BONDERY_EXPORT_DATA_SCHEMA_TYPES,
  BONDERY_EXPORT_FORMAT,
  BONDERY_EXPORT_SCHEMA_TYPES,
} from "./types.js";

export {
  BONDERY_EXPORT_AVATARS_PREFIX,
  BONDERY_EXPORT_DATA_SCHEMA_TYPES,
  BONDERY_EXPORT_FILE_ENTRIES,
  BONDERY_EXPORT_FORMAT,
  BONDERY_EXPORT_SCHEMA_TYPES,
  isBonderyExportAvatarFolderPath,
  matchBonderyExportAvatarEntry,
} from "./types.js";

export const bonderyExportFormatSchema: z.ZodType<BonderyExportFormat> =
  z.literal(BONDERY_EXPORT_FORMAT);

export const bonderyExportDataSchemaTypeSchema: z.ZodType<BonderyExportDataSchemaType> = z.enum(
  BONDERY_EXPORT_DATA_SCHEMA_TYPES,
);

export const bonderyExportSchemaTypeSchema: z.ZodType<BonderyExportSchemaType> = z.enum(
  BONDERY_EXPORT_SCHEMA_TYPES,
);

export const exportCountsSchema: z.ZodType<ExportCounts> = z.object({
  groups: z.number().int().nonnegative(),
  interactions: z.number().int().nonnegative(),
  people: z.number().int().nonnegative(),
  relationships: z.number().int().nonnegative(),
  tags: z.number().int().nonnegative(),
});

export const exportSummarySchema: z.ZodType<ExportSummary> = z.object({
  bonderyVersion: z.string().min(1).describe("Bondery version that wrote this export"),
  groups: z.number().int().nonnegative().describe("Number of groups in the export"),
  interactions: z.number().int().nonnegative().describe("Number of interactions in the export"),
  people: z.number().int().nonnegative().describe("Number of contacts in the export"),
  relationships: z.number().int().nonnegative().describe("Number of relationships in the export"),
  tags: z.number().int().nonnegative().describe("Number of tags in the export"),
});

export const exportSummaryResponseSchema: z.ZodType<ExportSummaryResponse> = z.object({
  exportSummary: exportSummarySchema.describe("Counts of records in a full export"),
});

export const importTypeResultSchema: z.ZodType<ImportTypeResult> = z.object({
  inserted: z.number().int().nonnegative().describe("Number of new records written"),
  skipped: z.number().int().nonnegative().describe("Number of records not written"),
});

export const importResultSchema: z.ZodType<ImportResult> = z.object({
  groupMemberships: importTypeResultSchema.describe("Group membership import result"),
  groups: importTypeResultSchema.describe("Group import result"),
  interactions: importTypeResultSchema.describe("Interaction import result"),
  people: importTypeResultSchema.describe("Contact import result"),
  photos: importTypeResultSchema.describe("Photo import result"),
  relationships: importTypeResultSchema.describe("Relationship import result"),
  tagMemberships: importTypeResultSchema.describe("Tag membership import result"),
  tags: importTypeResultSchema.describe("Tag import result"),
});

export const importResultResponseSchema: z.ZodType<ImportResultResponse> = z.object({
  importResult: importResultSchema.describe("Counts of records written from this import"),
});

export const exportManifestFileEntrySchema: z.ZodType<ExportManifestFileEntry> = z.object({
  count: z.number().int().nonnegative(),
  name: z.string().min(1),
  schemaType: bonderyExportDataSchemaTypeSchema,
});

export const exportManifestSchema: z.ZodType<ExportManifest> = z.object({
  bonderyVersion: z.string().min(1),
  counts: exportCountsSchema,
  exportedAt: createdAtSchema,
  files: z.array(exportManifestFileEntrySchema),
  format: bonderyExportFormatSchema,
  includedTypes: z.array(bonderyExportDataSchemaTypeSchema),
  schemaType: z.literal("Manifest"),
});

const exportPhoneRecordSchema: z.ZodType<ExportPhoneRecord> = z.object({
  createdAt: createdAtSchema,
  id: z.string(),
  preferred: z.boolean(),
  prefix: z.string(),
  sortOrder: z.number().int(),
  type: z.string(),
  updatedAt: createdAtSchema,
  value: z.string(),
});

const exportEmailRecordSchema: z.ZodType<ExportEmailRecord> = z.object({
  createdAt: createdAtSchema,
  id: z.string(),
  preferred: z.boolean(),
  sortOrder: z.number().int(),
  type: z.string(),
  updatedAt: createdAtSchema,
  value: z.string(),
});

const exportSocialRecordSchema: z.ZodType<ExportSocialRecord> = z.object({
  connectedAt: nullableDateTimeSchema,
  createdAt: createdAtSchema,
  handle: z.string(),
  id: z.string(),
  platform: z.string(),
  updatedAt: createdAtSchema,
});

const exportAddressRecordSchema: z.ZodType<ExportAddressRecord> = z.object({
  addressCity: z.string().nullable(),
  addressCountry: z.string().nullable(),
  addressCountryCode: z.string().nullable(),
  addressFormatted: z.string().nullable(),
  addressGeocodeSource: z.string().nullable(),
  addressGranularity: z.string(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  addressPostalCode: z.string().nullable(),
  addressState: z.string().nullable(),
  addressStateCode: z.string().nullable(),
  createdAt: createdAtSchema,
  geocodeConfidence: z.string().nullable(),
  id: z.string(),
  label: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  sortOrder: z.number().int(),
  timezone: z.string().nullable(),
  type: z.string(),
  updatedAt: createdAtSchema,
  value: z.string(),
});

const exportImportantDateRecordSchema: z.ZodType<ExportImportantDateRecord> = z.object({
  createdAt: createdAtSchema,
  date: z.string(),
  id: z.string(),
  note: z.string().nullable(),
  notifyDaysBefore: z.number().int().nullable(),
  notifyOn: z.string().nullable(),
  type: z.string(),
  updatedAt: createdAtSchema,
});

const exportWorkHistoryRecordSchema: z.ZodType<ExportWorkHistoryRecord> = z.object({
  companyLinkedinId: z.string().nullable(),
  companyName: z.string(),
  createdAt: createdAtSchema,
  description: z.string().nullable(),
  employmentType: z.string().nullable(),
  endDate: z.string().nullable(),
  id: z.string(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  title: z.string().nullable(),
  updatedAt: createdAtSchema,
});

const exportEducationHistoryRecordSchema: z.ZodType<ExportEducationHistoryRecord> = z.object({
  createdAt: createdAtSchema,
  degree: z.string().nullable(),
  description: z.string().nullable(),
  endDate: z.string().nullable(),
  id: z.string(),
  schoolLinkedinId: z.string().nullable(),
  schoolName: z.string(),
  startDate: z.string().nullable(),
  updatedAt: createdAtSchema,
});

const exportLinkedinRecordSchema: z.ZodType<ExportLinkedinRecord> = z.object({
  bio: z.string().nullable(),
  educationHistory: z.array(exportEducationHistoryRecordSchema),
  workHistory: z.array(exportWorkHistoryRecordSchema),
});

export const exportPersonRecordSchema: z.ZodType<ExportPersonRecord> = z.object({
  addresses: z.array(exportAddressRecordSchema),
  createdAt: createdAtSchema,
  emails: z.array(exportEmailRecordSchema),
  firstName: z.string(),
  hasAvatar: z.boolean(),
  headline: z.string().nullable(),
  id: z.string(),
  importantDates: z.array(exportImportantDateRecordSchema),
  keepFrequencyDays: z.number().int().nullable(),
  language: z.string().nullable(),
  lastInteraction: nullableDateTimeSchema,
  lastInteractionActivityId: z.string().nullable(),
  lastName: z.string().nullable(),
  latitude: z.number().nullable(),
  linkedin: exportLinkedinRecordSchema.nullable(),
  location: z.string().nullable(),
  longitude: z.number().nullable(),
  middleName: z.string().nullable(),
  notes: z.string().nullable(),
  notesUpdatedAt: nullableDateTimeSchema,
  phones: z.array(exportPhoneRecordSchema),
  socials: z.array(exportSocialRecordSchema),
  timezone: z.string().nullable(),
  updatedAt: createdAtSchema,
});

export const exportMembershipRecordSchema: z.ZodType<ExportMembershipRecord> = z.object({
  createdAt: createdAtSchema,
  id: z.string(),
  personId: z.string(),
});

export const exportGroupRecordSchema: z.ZodType<ExportGroupRecord> = z.object({
  color: z.string().nullable(),
  createdAt: createdAtSchema,
  emoji: z.string().nullable(),
  id: z.string(),
  label: z.string(),
  members: z.array(exportMembershipRecordSchema),
  updatedAt: createdAtSchema,
});

export const exportTagRecordSchema: z.ZodType<ExportTagRecord> = z.object({
  color: z.string().nullable(),
  createdAt: createdAtSchema,
  id: z.string(),
  label: z.string(),
  members: z.array(exportMembershipRecordSchema),
  updatedAt: createdAtSchema,
});

export const exportInteractionRecordSchema: z.ZodType<ExportInteractionRecord> = z.object({
  createdAt: createdAtSchema,
  date: createdAtSchema,
  description: z.string().nullable(),
  id: z.string(),
  participantIds: z.array(z.string()),
  title: z.string().nullable(),
  type: z.string(),
  updatedAt: createdAtSchema,
});

export const exportRelationshipRecordSchema: z.ZodType<ExportRelationshipRecord> = z.object({
  createdAt: createdAtSchema,
  id: z.string(),
  relationshipType: z.string(),
  sourcePersonId: z.string(),
  targetPersonId: z.string(),
  updatedAt: createdAtSchema,
});

function exportFileEnvelopeSchema<TSchemaType extends BonderyExportDataSchemaType, TRecord>(
  schemaType: TSchemaType,
  recordSchema: z.ZodType<TRecord>,
): z.ZodType<ExportFileEnvelope<TSchemaType, TRecord>> {
  return z.object({
    bonderyVersion: z.string().min(1),
    records: z.array(recordSchema),
    schemaType: z.literal(schemaType),
  });
}

export const exportMyselfFileSchema: z.ZodType<ExportMyselfFile> = z.object({
  bonderyVersion: z.string().min(1),
  records: z.array(exportPersonRecordSchema).max(1),
  schemaType: z.literal("Myself"),
});

export const exportPeopleFileSchema = exportFileEnvelopeSchema("People", exportPersonRecordSchema);
export const exportGroupsFileSchema = exportFileEnvelopeSchema("Groups", exportGroupRecordSchema);
export const exportTagsFileSchema = exportFileEnvelopeSchema("Tags", exportTagRecordSchema);
export const exportInteractionsFileSchema = exportFileEnvelopeSchema(
  "Interactions",
  exportInteractionRecordSchema,
);
export const exportRelationshipsFileSchema = exportFileEnvelopeSchema(
  "Relationships",
  exportRelationshipRecordSchema,
);

/** UTC calendar date in `bondery-export-YYYY-MM-DD.zip`. */
export function buildBonderyExportFilename(exportedAt: Date = new Date()): string {
  return `bondery-export-${exportedAt.toISOString().slice(0, 10)}.zip`;
}
