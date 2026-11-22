import { isValidUuid } from "@bondery/helpers/ids";
import {
  AVATAR_UPLOAD,
  BONDERY_EXPORT_FILE_ENTRIES,
  type ExportGroupRecord,
  type ExportInteractionRecord,
  type ExportPersonRecord,
  type ExportRelationshipRecord,
  type ExportTagRecord,
  exportGroupsFileSchema,
  exportInteractionsFileSchema,
  exportManifestSchema,
  exportMyselfFileSchema,
  exportPeopleFileSchema,
  exportRelationshipsFileSchema,
  exportTagsFileSchema,
  isBonderyExportAvatarFolderPath,
  matchBonderyExportAvatarEntry,
} from "@bondery/schemas";
import AdmZip from "adm-zip";
import type { FastifyBaseLogger } from "fastify";
import { BYTES_PER_MIB, validateImageMagicBytes } from "../platform/config.js";
import { badRequest } from "../platform/errors/http-errors.js";

const A_ZA_Z_PATTERN = /^[a-zA-Z]:/;
const TRAILING_SLASH_PATTERN = /\/$/;

const MAX_NON_PHOTO_ZIP_ENTRIES = 32;
const MAX_PHOTO_ZIP_FILES = 10_000;
const MAX_UNCOMPRESSED_MIB = 200;
const MAX_UNCOMPRESSED_BYTES = MAX_UNCOMPRESSED_MIB * BYTES_PER_MIB;
const MAX_PHOTO_BYTES = AVATAR_UPLOAD.maxFileSizeBytes;

const FOLLOWERS_JSON_PATTERN = /^followers(?:_\d+)?\.json$/;

const REQUIRED_ROOT_FILES = new Set<string>([
  "manifest.json",
  ...BONDERY_EXPORT_FILE_ENTRIES.map((entry) => entry.name),
]);

type ParsedGroupMembership = {
  createdAt: string;
  groupId: string;
  id: string;
  personId: string;
};

type ParsedTagMembership = {
  createdAt: string;
  id: string;
  personId: string;
  tagId: string;
};

type ParsedBonderyExport = {
  bonderyVersion: string;
  groupMemberships: ParsedGroupMembership[];
  groups: ExportGroupRecord[];
  interactions: ExportInteractionRecord[];
  myself: ExportPersonRecord[];
  people: ExportPersonRecord[];
  photos: Map<string, Buffer>;
  photosSkipped: number;
  relationships: ExportRelationshipRecord[];
  tagMemberships: ParsedTagMembership[];
  tags: ExportTagRecord[];
};

function invalidZip(message: string): never {
  throw badRequest(message, "import_bondery_invalid");
}

function normalizeZipPath(entryName: string): string {
  return entryName.replaceAll("\\", "/");
}

function zipBaseName(entryName: string): string {
  const normalized = normalizeZipPath(entryName);
  const parts = normalized.split("/").filter(Boolean);
  return (parts.at(-1) ?? normalized).toLowerCase();
}

function isUnsafeZipPath(entryName: string): boolean {
  const normalized = normalizeZipPath(entryName);
  if (normalized.includes("..") || normalized.startsWith("/")) {
    return true;
  }
  return A_ZA_Z_PATTERN.test(entryName);
}

function isNestedFilePath(entryName: string): boolean {
  return normalizeZipPath(entryName).replace(TRAILING_SLASH_PATTERN, "").includes("/");
}

/** A ZIP local-file or archive header starts with a four-byte signature: `PK` plus two bytes. */
const ZIP_SIGNATURE_LENGTH = 4;

function isZipMagic(buffer: Buffer): boolean {
  if (buffer.length < ZIP_SIGNATURE_LENGTH) {
    return false;
  }
  const third = buffer[2] ?? -1;
  return (
    buffer[0] === 0x50 && buffer[1] === 0x4b && (third === 0x03 || third === 0x05 || third === 0x07)
  );
}

function detectForeignDump(entryNames: string[]): "instagram" | "linkedin" | "vcard" | null {
  for (const name of entryNames) {
    const base = zipBaseName(name);
    if (base.endsWith(".vcf")) {
      return "vcard";
    }
    if (base === "connections.csv" || base === "invitations.csv" || base === "profile.csv") {
      return "linkedin";
    }
    if (
      base === "following.json" ||
      base === "close_friends.json" ||
      FOLLOWERS_JSON_PATTERN.test(base)
    ) {
      return "instagram";
    }
  }
  return null;
}

function parseJsonFile(zip: AdmZip, name: string): unknown {
  const entry = zip.getEntry(name);
  if (!entry || entry.isDirectory) {
    invalidZip(`Missing ${name} in Bondery export ZIP`);
  }
  const data = entry.getData();
  if (data.length > MAX_UNCOMPRESSED_BYTES) {
    invalidZip("ZIP uncompressed size exceeds the limit");
  }
  try {
    return JSON.parse(data.toString("utf8")) as unknown;
  } catch {
    invalidZip(`Invalid JSON in ${name}`);
  }
}

function photoSourcePersonId(entryName: string): string | null {
  const sourcePersonId = matchBonderyExportAvatarEntry(entryName);
  if (!sourcePersonId || !isValidUuid(sourcePersonId)) {
    return null;
  }
  return sourcePersonId;
}

export type { ParsedBonderyExport, ParsedGroupMembership, ParsedTagMembership };

/**
 * Validates a Bondery export ZIP in memory and returns the typed CRM graph.
 * Never writes the archive to disk.
 */
export function parseBonderyExportZip(
  buffer: Buffer,
  options: { log?: FastifyBaseLogger } = {},
): ParsedBonderyExport {
  if (!isZipMagic(buffer)) {
    invalidZip("File is not a ZIP archive");
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    invalidZip("Could not read ZIP archive");
  }

  const entries = zip.getEntries();
  if (entries.length === 0) {
    invalidZip("ZIP archive has an invalid number of entries");
  }

  let uncompressedTotal = 0;
  let nonPhotoFiles = 0;
  let photoFiles = 0;
  let photosSkipped = 0;
  const photos = new Map<string, Buffer>();
  const entryNames: string[] = [];

  for (const entry of entries) {
    const entryName = entry.entryName;
    entryNames.push(entryName);

    if (isUnsafeZipPath(entryName)) {
      invalidZip("ZIP contains an unsafe path");
    }

    uncompressedTotal += entry.header.size;
    if (uncompressedTotal > MAX_UNCOMPRESSED_BYTES) {
      invalidZip("ZIP uncompressed size exceeds the limit");
    }

    if (entry.isDirectory) {
      continue;
    }

    const sourcePersonId = photoSourcePersonId(entryName);
    if (sourcePersonId) {
      photoFiles += 1;
      if (photoFiles > MAX_PHOTO_ZIP_FILES) {
        invalidZip("ZIP archive has an invalid number of entries");
      }

      if (entry.header.size > MAX_PHOTO_BYTES) {
        photosSkipped += 1;
        continue;
      }

      const data = entry.getData();
      if (data.length > MAX_PHOTO_BYTES || !validateImageMagicBytes(data)) {
        photosSkipped += 1;
        continue;
      }

      if (photos.has(sourcePersonId)) {
        photosSkipped += 1;
        continue;
      }

      photos.set(sourcePersonId, data);
      continue;
    }

    if (isBonderyExportAvatarFolderPath(entryName)) {
      continue;
    }

    nonPhotoFiles += 1;
    if (nonPhotoFiles > MAX_NON_PHOTO_ZIP_ENTRIES) {
      invalidZip("ZIP archive has an invalid number of entries");
    }

    if (REQUIRED_ROOT_FILES.has(zipBaseName(entryName)) && isNestedFilePath(entryName)) {
      invalidZip("Bondery export files must be at the archive root");
    }
  }

  const dumpKind = detectForeignDump(entryNames);
  if (dumpKind === "linkedin") {
    invalidZip("This archive looks like a LinkedIn export");
  }
  if (dumpKind === "instagram") {
    invalidZip("This archive looks like an Instagram export");
  }
  if (dumpKind === "vcard") {
    invalidZip("This archive looks like a vCard export");
  }

  const rootNames = new Set(
    entries
      .filter((entry) => !entry.isDirectory && !isNestedFilePath(entry.entryName))
      .map((entry) => zipBaseName(entry.entryName)),
  );

  for (const required of REQUIRED_ROOT_FILES) {
    if (!rootNames.has(required)) {
      invalidZip(`Missing ${required} in Bondery export ZIP`);
    }
  }

  const manifestParsed = exportManifestSchema.safeParse(parseJsonFile(zip, "manifest.json"));
  if (!manifestParsed.success) {
    invalidZip("Invalid Bondery export manifest");
  }

  options.log?.info(
    { bonderyVersion: manifestParsed.data.bonderyVersion },
    "Bondery export ZIP version",
  );

  const peopleFile = exportPeopleFileSchema.safeParse(parseJsonFile(zip, "people.json"));
  const myselfFile = exportMyselfFileSchema.safeParse(parseJsonFile(zip, "myself.json"));
  const groupsFile = exportGroupsFileSchema.safeParse(parseJsonFile(zip, "groups.json"));
  const tagsFile = exportTagsFileSchema.safeParse(parseJsonFile(zip, "tags.json"));
  const interactionsFile = exportInteractionsFileSchema.safeParse(
    parseJsonFile(zip, "interactions.json"),
  );
  const relationshipsFile = exportRelationshipsFileSchema.safeParse(
    parseJsonFile(zip, "relationships.json"),
  );

  if (
    !peopleFile.success ||
    !myselfFile.success ||
    !groupsFile.success ||
    !tagsFile.success ||
    !interactionsFile.success ||
    !relationshipsFile.success
  ) {
    invalidZip("Bondery export files failed schema validation");
  }

  return {
    bonderyVersion: manifestParsed.data.bonderyVersion,
    groupMemberships: groupsFile.data.records.flatMap((group) =>
      group.members.map((member) => ({
        createdAt: member.createdAt,
        groupId: group.id,
        id: member.id,
        personId: member.personId,
      })),
    ),
    groups: groupsFile.data.records,
    interactions: interactionsFile.data.records,
    myself: myselfFile.data.records,
    people: peopleFile.data.records,
    photos,
    photosSkipped,
    relationships: relationshipsFile.data.records,
    tagMemberships: tagsFile.data.records.flatMap((tag) =>
      tag.members.map((member) => ({
        createdAt: member.createdAt,
        id: member.id,
        personId: member.personId,
        tagId: tag.id,
      })),
    ),
    tags: tagsFile.data.records,
  };
}
