import { createRequire } from "node:module";
import { readRuntimeProductVersion } from "@bondery/helpers/infra/build-metadata";
import {
  BONDERY_EXPORT_DATA_SCHEMA_TYPES,
  BONDERY_EXPORT_FILE_ENTRIES,
  BONDERY_EXPORT_FORMAT,
  buildBonderyExportFilename,
  type ExportCounts,
  type ExportGroupRecord,
  type ExportInteractionRecord,
  type ExportManifest,
  type ExportMembershipRecord,
  type ExportPersonRecord,
  type ExportRelationshipRecord,
  type ExportSummary,
  type ExportTagRecord,
} from "@bondery/schemas";
import AdmZip from "adm-zip";
import { internal } from "../../lib/platform/errors/http-errors.js";
import type { DomainContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { mapPerson, peopleExportSelect, toIso } from "./export-map.js";
import { addExportedAvatarFiles } from "./export-photos.js";

const require = createRequire(import.meta.url);
const apiPackage = require("../../../package.json") as { version: string };

export function getBonderyApiVersion(): string {
  return readRuntimeProductVersion(apiPackage.version);
}

export type GenerateExportZipOptions = {
  bonderyVersion?: string;
  now?: Date;
};

export type GenerateExportZipResult = {
  buffer: Buffer;
  counts: ExportCounts;
  filename: string;
  isEmpty: boolean;
};

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isExportEmpty(counts: ExportCounts): boolean {
  return (
    counts.people === 0 &&
    counts.groups === 0 &&
    counts.tags === 0 &&
    counts.interactions === 0 &&
    counts.relationships === 0
  );
}

function membersByParentId(
  rows: Array<{ createdAt: Date; id: string; parentId: string; personId: string }>,
): Map<string, ExportMembershipRecord[]> {
  const membersByParent = new Map<string, ExportMembershipRecord[]>();
  for (const row of rows) {
    const members = membersByParent.get(row.parentId) ?? [];
    members.push({
      createdAt: toIso(row.createdAt),
      id: row.id,
      personId: row.personId,
    });
    membersByParent.set(row.parentId, members);
  }
  return membersByParent;
}

export async function getExportSummary(
  ctx: DomainContext,
): Promise<{ exportSummary: ExportSummary }> {
  const db = domainDb(ctx);
  const userId = ctx.user.id;
  const tenantWhere = { userId };

  try {
    const [people, groups, tags, interactions, relationships] = await Promise.all([
      db.people.count({ where: { NOT: { myself: true }, userId } }),
      db.group.count({ where: tenantWhere }),
      db.tag.count({ where: tenantWhere }),
      db.interaction.count({ where: tenantWhere }),
      db.peopleRelationship.count({ where: tenantWhere }),
    ]);

    return {
      exportSummary: {
        bonderyVersion: getBonderyApiVersion(),
        groups,
        interactions,
        people,
        relationships,
        tags,
      },
    };
  } catch (error) {
    ctx.log?.error({ err: error }, "Failed to load export summary");
    throw internal("export_failed_to_generate", error);
  }
}

export async function generateExportZip(
  ctx: DomainContext,
  options: GenerateExportZipOptions = {},
): Promise<GenerateExportZipResult> {
  const db = domainDb(ctx);
  const userId = ctx.user.id;
  const tenantWhere = { userId };
  const bonderyVersion = options.bonderyVersion ?? getBonderyApiVersion();
  const now = options.now ?? new Date();

  try {
    const [
      peopleRows,
      groupRows,
      tagRows,
      groupMembershipRows,
      tagMembershipRows,
      interactionRows,
      relationshipRows,
    ] = await Promise.all([
      db.people.findMany({
        select: peopleExportSelect,
        where: tenantWhere,
      }),
      db.group.findMany({
        select: {
          color: true,
          createdAt: true,
          emoji: true,
          id: true,
          label: true,
          updatedAt: true,
        },
        where: tenantWhere,
      }),
      db.tag.findMany({
        select: {
          color: true,
          createdAt: true,
          id: true,
          label: true,
          updatedAt: true,
        },
        where: tenantWhere,
      }),
      db.peopleGroup.findMany({
        select: {
          createdAt: true,
          groupId: true,
          id: true,
          personId: true,
        },
        where: tenantWhere,
      }),
      db.peopleTag.findMany({
        select: {
          createdAt: true,
          id: true,
          personId: true,
          tagId: true,
        },
        where: tenantWhere,
      }),
      db.interaction.findMany({
        select: {
          createdAt: true,
          date: true,
          description: true,
          id: true,
          participants: { select: { personId: true } },
          title: true,
          type: true,
          updatedAt: true,
        },
        where: tenantWhere,
      }),
      db.peopleRelationship.findMany({
        select: {
          createdAt: true,
          id: true,
          relationshipType: true,
          sourcePersonId: true,
          targetPersonId: true,
          updatedAt: true,
        },
        where: tenantWhere,
      }),
    ]);

    const myself: ExportPersonRecord[] = [];
    const people: ExportPersonRecord[] = [];
    for (const row of peopleRows) {
      const person = mapPerson(row);
      if (row.myself === true) {
        if (myself.length === 0) {
          myself.push(person);
        }
        continue;
      }
      people.push(person);
    }
    const groupMembers = membersByParentId(
      groupMembershipRows.map((row) => ({
        createdAt: row.createdAt,
        id: row.id,
        parentId: row.groupId,
        personId: row.personId,
      })),
    );
    const tagMembers = membersByParentId(
      tagMembershipRows.map((row) => ({
        createdAt: row.createdAt,
        id: row.id,
        parentId: row.tagId,
        personId: row.personId,
      })),
    );
    const groups: ExportGroupRecord[] = groupRows.map((row) => ({
      color: row.color,
      createdAt: toIso(row.createdAt),
      emoji: row.emoji,
      id: row.id,
      label: row.label,
      members: groupMembers.get(row.id) ?? [],
      updatedAt: toIso(row.updatedAt),
    }));
    const tags: ExportTagRecord[] = tagRows.map((row) => ({
      color: row.color,
      createdAt: toIso(row.createdAt),
      id: row.id,
      label: row.label,
      members: tagMembers.get(row.id) ?? [],
      updatedAt: toIso(row.updatedAt),
    }));
    const interactions: ExportInteractionRecord[] = interactionRows.map((row) => ({
      createdAt: toIso(row.createdAt),
      date: toIso(row.date),
      description: row.description,
      id: row.id,
      participantIds: row.participants.map((participant) => participant.personId),
      title: row.title,
      type: row.type,
      updatedAt: toIso(row.updatedAt),
    }));
    const relationships: ExportRelationshipRecord[] = relationshipRows.map((row) => ({
      createdAt: toIso(row.createdAt),
      id: row.id,
      relationshipType: row.relationshipType,
      sourcePersonId: row.sourcePersonId,
      targetPersonId: row.targetPersonId,
      updatedAt: toIso(row.updatedAt),
    }));

    const counts: ExportCounts = {
      groups: groups.length,
      interactions: interactions.length,
      people: people.length,
      relationships: relationships.length,
      tags: tags.length,
    };

    const recordsBySchemaType = {
      Groups: groups,
      Interactions: interactions,
      Myself: myself,
      People: people,
      Relationships: relationships,
      Tags: tags,
    } as const;

    const manifest: ExportManifest = {
      bonderyVersion,
      counts,
      exportedAt: toIso(now),
      files: BONDERY_EXPORT_FILE_ENTRIES.map((entry) => ({
        count: recordsBySchemaType[entry.schemaType].length,
        name: entry.name,
        schemaType: entry.schemaType,
      })),
      format: BONDERY_EXPORT_FORMAT,
      includedTypes: [...BONDERY_EXPORT_DATA_SCHEMA_TYPES],
      schemaType: "Manifest",
    };

    const zip = new AdmZip();
    zip.addFile("manifest.json", Buffer.from(prettyJson(manifest), "utf8"));

    for (const entry of BONDERY_EXPORT_FILE_ENTRIES) {
      zip.addFile(
        entry.name,
        Buffer.from(
          prettyJson({
            bonderyVersion,
            records: recordsBySchemaType[entry.schemaType],
            schemaType: entry.schemaType,
          }),
          "utf8",
        ),
      );
    }

    await addExportedAvatarFiles({
      personIds: new Set([...myself, ...people].map((person) => person.id)),
      userId,
      zip,
    });

    return {
      buffer: zip.toBuffer(),
      counts,
      filename: buildBonderyExportFilename(now),
      isEmpty: isExportEmpty(counts),
    };
  } catch (error) {
    ctx.log?.error({ err: error }, "Failed to generate data export");
    throw internal("export_failed_to_generate", error);
  }
}
