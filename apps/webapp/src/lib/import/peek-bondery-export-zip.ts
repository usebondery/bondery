import {
  BONDERY_EXPORT_FILE_ENTRIES,
  BONDERY_EXPORT_FORMAT,
  exportManifestSchema,
  exportPeopleFileSchema,
} from "@bondery/schemas";
import { strFromU8, unzipSync } from "fflate";

const PATTERN = /\/$/u;

const FOLLOWERS_JSON_PATTERN = /^followers(?:_\d+)?\.json$/u;

function normalizeZipPath(entryName: string): string {
  return entryName.replaceAll("\\", "/");
}

function zipBaseName(entryName: string): string {
  const normalized = normalizeZipPath(entryName);
  const parts = normalized.split("/").filter(Boolean);
  return (parts.at(-1) ?? normalized).toLowerCase();
}

function isNestedFilePath(entryName: string): boolean {
  return normalizeZipPath(entryName).replace(PATTERN, "").includes("/");
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

function countImportablePeople(peopleBytes: Uint8Array | undefined, fallback: number): number {
  if (!peopleBytes) {
    return fallback;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(strFromU8(peopleBytes)) as unknown;
  } catch {
    return fallback;
  }

  const peopleFile = exportPeopleFileSchema.safeParse(parsedJson);
  if (!peopleFile.success) {
    return fallback;
  }

  return peopleFile.data.records.length;
}

export type BonderyImportPeekKind = "instagram" | "invalid" | "linkedin" | "vcard";

export class BonderyImportPeekError extends Error {
  readonly kind: BonderyImportPeekKind;

  constructor(kind: BonderyImportPeekKind, options?: ErrorOptions) {
    super(kind, options);
    this.kind = kind;
    this.name = "BonderyImportPeekError";
  }
}

export type BonderyImportPeekCounts = {
  groups: number;
  interactions: number;
  people: number;
  tags: number;
};

/**
 * Client-side ZIP peek for Review chips and wrong-platform detection.
 * Does not write files or decode images. People count is contacts only (`people.json`).
 */
export function peekBonderyExportZip(bytes: Uint8Array): BonderyImportPeekCounts {
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(bytes);
  } catch (error) {
    throw new BonderyImportPeekError("invalid", { cause: error });
  }

  const entryNames = Object.keys(unzipped);
  if (entryNames.length === 0) {
    throw new BonderyImportPeekError("invalid");
  }

  const dumpKind = detectForeignDump(entryNames);
  if (dumpKind) {
    throw new BonderyImportPeekError(dumpKind);
  }

  const required = new Set([
    "manifest.json",
    ...BONDERY_EXPORT_FILE_ENTRIES.map((file) => file.name),
  ]);
  const rootNames = new Set<string>();

  for (const name of entryNames) {
    if (name.endsWith("/")) {
      continue;
    }
    const base = zipBaseName(name);
    if (required.has(base) && isNestedFilePath(name)) {
      throw new BonderyImportPeekError("invalid");
    }
    if (!isNestedFilePath(name)) {
      rootNames.add(base);
    }
  }

  for (const name of required) {
    if (!rootNames.has(name)) {
      throw new BonderyImportPeekError("invalid");
    }
  }

  const manifestBytes = unzipped["manifest.json"];
  if (!manifestBytes) {
    throw new BonderyImportPeekError("invalid");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(strFromU8(manifestBytes)) as unknown;
  } catch (error) {
    throw new BonderyImportPeekError("invalid", { cause: error });
  }

  const manifest = exportManifestSchema.safeParse(parsedJson);
  if (!manifest.success || manifest.data.format !== BONDERY_EXPORT_FORMAT) {
    throw new BonderyImportPeekError("invalid");
  }

  return {
    groups: manifest.data.counts.groups,
    interactions: manifest.data.counts.interactions,
    people: countImportablePeople(unzipped["people.json"], manifest.data.counts.people),
    tags: manifest.data.counts.tags,
  };
}
