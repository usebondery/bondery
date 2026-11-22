const BONDERY_EXPORT_AVATAR_ENTRY_PATTERN =
  /^(?:avatars|photos)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/i;
export const BONDERY_EXPORT_FORMAT = "bondery-export" as const;

/** ZIP folder for optional contact JPEGs (`avatars/{sourcePersonId}.jpg`). */
export const BONDERY_EXPORT_AVATARS_PREFIX = "avatars/";

/**
 * Returns the source person id when `entryName` is `avatars/{uuid}.jpg`
 * (or the unreleased `photos/` alias). Nested paths and other extensions do not match.
 */
export function matchBonderyExportAvatarEntry(entryName: string): string | null {
  const normalized = entryName.replaceAll("\\", "/");
  const match = BONDERY_EXPORT_AVATAR_ENTRY_PATTERN.exec(normalized);
  return match?.[1] ?? null;
}

export function isBonderyExportAvatarFolderPath(entryName: string): boolean {
  const normalized = entryName.replaceAll("\\", "/");
  return normalized.startsWith(BONDERY_EXPORT_AVATARS_PREFIX) || normalized.startsWith("photos/");
}

export const BONDERY_EXPORT_DATA_SCHEMA_TYPES = [
  "Myself",
  "People",
  "Groups",
  "Tags",
  "Interactions",
  "Relationships",
] as const;

export const BONDERY_EXPORT_SCHEMA_TYPES = [
  ...BONDERY_EXPORT_DATA_SCHEMA_TYPES,
  "Manifest",
] as const;

export type BonderyExportFormat = typeof BONDERY_EXPORT_FORMAT;
export type BonderyExportDataSchemaType = (typeof BONDERY_EXPORT_DATA_SCHEMA_TYPES)[number];
export type BonderyExportSchemaType = (typeof BONDERY_EXPORT_SCHEMA_TYPES)[number];

export const BONDERY_EXPORT_FILE_ENTRIES = [
  { name: "myself.json", schemaType: "Myself" },
  { name: "people.json", schemaType: "People" },
  { name: "groups.json", schemaType: "Groups" },
  { name: "tags.json", schemaType: "Tags" },
  { name: "interactions.json", schemaType: "Interactions" },
  { name: "relationships.json", schemaType: "Relationships" },
] as const satisfies ReadonlyArray<{
  name: string;
  schemaType: BonderyExportDataSchemaType;
}>;

export interface ExportCounts {
  groups: number;
  interactions: number;
  people: number;
  relationships: number;
  tags: number;
}

export interface ExportSummary extends ExportCounts {
  bonderyVersion: string;
}

export interface ExportSummaryResponse {
  exportSummary: ExportSummary;
}

export interface ExportManifestFileEntry {
  count: number;
  name: string;
  schemaType: BonderyExportDataSchemaType;
}

export interface ExportManifest {
  bonderyVersion: string;
  counts: ExportCounts;
  exportedAt: string;
  files: ExportManifestFileEntry[];
  format: BonderyExportFormat;
  includedTypes: BonderyExportDataSchemaType[];
  schemaType: "Manifest";
}

export interface ExportFileEnvelope<TSchemaType extends BonderyExportDataSchemaType, TRecord> {
  bonderyVersion: string;
  records: TRecord[];
  schemaType: TSchemaType;
}

export interface ExportPhoneRecord {
  createdAt: string;
  id: string;
  preferred: boolean;
  prefix: string;
  sortOrder: number;
  type: string;
  updatedAt: string;
  value: string;
}

export interface ExportEmailRecord {
  createdAt: string;
  id: string;
  preferred: boolean;
  sortOrder: number;
  type: string;
  updatedAt: string;
  value: string;
}

export interface ExportSocialRecord {
  connectedAt: string | null;
  createdAt: string;
  handle: string;
  id: string;
  platform: string;
  updatedAt: string;
}

export interface ExportAddressRecord {
  addressCity: string | null;
  addressCountry: string | null;
  addressCountryCode: string | null;
  addressFormatted: string | null;
  addressGeocodeSource: string | null;
  addressGranularity: string;
  addressLine1: string | null;
  addressLine2: string | null;
  addressPostalCode: string | null;
  addressState: string | null;
  addressStateCode: string | null;
  createdAt: string;
  geocodeConfidence: string | null;
  id: string;
  label: string | null;
  latitude: number | null;
  longitude: number | null;
  sortOrder: number;
  timezone: string | null;
  type: string;
  updatedAt: string;
  value: string;
}

export interface ExportImportantDateRecord {
  createdAt: string;
  date: string;
  id: string;
  note: string | null;
  notifyDaysBefore: number | null;
  notifyOn: string | null;
  type: string;
  updatedAt: string;
}

export interface ExportWorkHistoryRecord {
  companyLinkedinId: string | null;
  companyName: string;
  createdAt: string;
  description: string | null;
  employmentType: string | null;
  endDate: string | null;
  id: string;
  location: string | null;
  startDate: string | null;
  title: string | null;
  updatedAt: string;
}

export interface ExportEducationHistoryRecord {
  createdAt: string;
  degree: string | null;
  description: string | null;
  endDate: string | null;
  id: string;
  schoolLinkedinId: string | null;
  schoolName: string;
  startDate: string | null;
  updatedAt: string;
}

export interface ExportLinkedinRecord {
  bio: string | null;
  educationHistory: ExportEducationHistoryRecord[];
  workHistory: ExportWorkHistoryRecord[];
}

export interface ExportPersonRecord {
  addresses: ExportAddressRecord[];
  createdAt: string;
  emails: ExportEmailRecord[];
  firstName: string;
  hasAvatar: boolean;
  headline: string | null;
  id: string;
  importantDates: ExportImportantDateRecord[];
  keepFrequencyDays: number | null;
  language: string | null;
  lastInteraction: string | null;
  lastInteractionActivityId: string | null;
  lastName: string | null;
  latitude: number | null;
  linkedin: ExportLinkedinRecord | null;
  location: string | null;
  longitude: number | null;
  middleName: string | null;
  notes: string | null;
  notesUpdatedAt: string | null;
  phones: ExportPhoneRecord[];
  socials: ExportSocialRecord[];
  timezone: string | null;
  updatedAt: string;
}

export interface ExportMembershipRecord {
  createdAt: string;
  id: string;
  personId: string;
}

export interface ExportGroupRecord {
  color: string | null;
  createdAt: string;
  emoji: string | null;
  id: string;
  label: string;
  members: ExportMembershipRecord[];
  updatedAt: string;
}

export interface ExportTagRecord {
  color: string | null;
  createdAt: string;
  id: string;
  label: string;
  members: ExportMembershipRecord[];
  updatedAt: string;
}

export interface ExportInteractionRecord {
  createdAt: string;
  date: string;
  description: string | null;
  id: string;
  participantIds: string[];
  title: string | null;
  type: string;
  updatedAt: string;
}

export interface ExportRelationshipRecord {
  createdAt: string;
  id: string;
  relationshipType: string;
  sourcePersonId: string;
  targetPersonId: string;
  updatedAt: string;
}

export interface ImportTypeResult {
  inserted: number;
  skipped: number;
}

export interface ImportResult {
  groupMemberships: ImportTypeResult;
  groups: ImportTypeResult;
  interactions: ImportTypeResult;
  people: ImportTypeResult;
  photos: ImportTypeResult;
  relationships: ImportTypeResult;
  tagMemberships: ImportTypeResult;
  tags: ImportTypeResult;
}

export interface ImportResultResponse {
  importResult: ImportResult;
}

export type ExportMyselfFile = ExportFileEnvelope<"Myself", ExportPersonRecord>;
export type ExportPeopleFile = ExportFileEnvelope<"People", ExportPersonRecord>;
export type ExportGroupsFile = ExportFileEnvelope<"Groups", ExportGroupRecord>;
export type ExportTagsFile = ExportFileEnvelope<"Tags", ExportTagRecord>;
export type ExportInteractionsFile = ExportFileEnvelope<"Interactions", ExportInteractionRecord>;
export type ExportRelationshipsFile = ExportFileEnvelope<"Relationships", ExportRelationshipRecord>;
