import type { PrismaClient } from "@bondery/db";
import type {
  InstagramImportCommitResponse,
  InstagramImportSource,
  InstagramPreparedContact,
} from "@bondery/schemas";
import { IMPORT_HANDLE_LOOKUP_CHUNK_SIZE } from "@bondery/schemas/constants";
import {
  assignContactsToDefaultImportGroup,
  type DefaultImportGroupKey,
  toInstagramImportGroupKeys,
} from "../../lib/import/default-groups.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { markBulkImportCompleted } from "../../services/import/followup.js";
import type { DomainContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { scheduleMergeRecommendationsRefresh } from "../contacts/merge-recommendations.js";

async function upsertPeopleSocials(
  db: PrismaClient,
  userId: string,
  rows: Array<{
    personId: string;
    platform: string;
    handle: string;
    connectedAt: Date | null;
  }>,
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const existing = await db.peopleSocial.findMany({
    select: { id: true, personId: true, platform: true },
    where: {
      OR: rows.map((row) => ({ personId: row.personId, platform: row.platform })),
      userId,
    },
  });

  const existingByKey = new Map(existing.map((row) => [`${row.personId}:${row.platform}`, row.id]));

  const toCreate = rows.filter((row) => !existingByKey.has(`${row.personId}:${row.platform}`));
  const toUpdate = rows.filter((row) => existingByKey.has(`${row.personId}:${row.platform}`));

  if (toCreate.length > 0) {
    await db.peopleSocial.createMany({
      data: toCreate.map((row) => ({
        connectedAt: row.connectedAt,
        handle: row.handle,
        personId: row.personId,
        platform: row.platform,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  await Promise.all(
    toUpdate.map((row) =>
      db.peopleSocial.updateMany({
        data: {
          connectedAt: row.connectedAt,
          handle: row.handle,
        },
        where: {
          personId: row.personId,
          platform: row.platform,
          userId,
        },
      }),
    ),
  );
}

export async function commitInstagramImport(
  ctx: DomainContext,
  rawImportContacts: InstagramPreparedContact[],
): Promise<InstagramImportCommitResponse> {
  const { user, log } = ctx;
  const db = domainDb(ctx);
  const rawContacts = rawImportContacts;

  const seenHandles = new Set<string>();
  const validContacts: InstagramPreparedContact[] = [];

  for (const contact of rawContacts) {
    if (!contact.isValid || !contact.instagramUsername) {
      continue;
    }

    const handle = contact.instagramUsername.trim().toLowerCase();
    if (!handle || seenHandles.has(handle)) {
      continue;
    }

    seenHandles.add(handle);
    validContacts.push(contact);
  }

  const skippedCount = rawContacts.length - validContacts.length;

  if (validContacts.length === 0) {
    return {
      importedCount: 0,
      skippedCount,
      updatedCount: 0,
    };
  }

  const now = new Date();
  const handles = validContacts.map((contact) => contact.instagramUsername.trim().toLowerCase());
  const handleToPersonId = new Map<string, string>();

  for (let index = 0; index < handles.length; index += IMPORT_HANDLE_LOOKUP_CHUNK_SIZE) {
    const chunk = handles.slice(index, index + IMPORT_HANDLE_LOOKUP_CHUNK_SIZE);

    const existingRows = await db.peopleSocial.findMany({
      select: { handle: true, personId: true },
      where: {
        handle: { in: chunk },
        platform: "instagram",
        userId: user.id,
      },
    });

    for (const row of existingRows) {
      if (row.handle && row.personId) {
        handleToPersonId.set(row.handle.trim().toLowerCase(), row.personId);
      }
    }
  }

  const toInsert = validContacts.filter(
    (contact) => !handleToPersonId.has(contact.instagramUsername.trim().toLowerCase()),
  );
  const toUpdate = validContacts.filter((contact) =>
    handleToPersonId.has(contact.instagramUsername.trim().toLowerCase()),
  );

  let importedCount = 0;
  const groupAssignments = new Map<DefaultImportGroupKey, Set<string>>();

  if (toInsert.length > 0) {
    const insertedPeople = await db.people.createManyAndReturn({
      data: toInsert.map((contact) => ({
        firstName: contact.firstName,
        lastInteraction: now,
        lastName: contact.lastName,
        middleName: contact.middleName,
        myself: false,
        userId: user.id,
      })),
      select: { id: true },
    });

    for (const [index, contact] of toInsert.entries()) {
      const inserted = insertedPeople[index];
      if (inserted) {
        const handle = contact.instagramUsername.trim().toLowerCase();
        handleToPersonId.set(handle, inserted.id);

        const sources = (contact.sources ?? []) as InstagramImportSource[];
        const groupKeys = toInstagramImportGroupKeys(sources);
        for (const groupKey of groupKeys) {
          const members = groupAssignments.get(groupKey) ?? new Set<string>();
          members.add(inserted.id);
          groupAssignments.set(groupKey, members);
        }
      }
    }

    importedCount = insertedPeople.length;
  }

  let updatedCount = 0;

  if (toUpdate.length > 0) {
    const updateResults = await Promise.all(
      toUpdate.flatMap((contact) => {
        const personId = handleToPersonId.get(contact.instagramUsername.trim().toLowerCase());
        if (!personId) {
          return [];
        }

        return [
          db.people.updateMany({
            data: {
              firstName: contact.firstName,
              lastName: contact.lastName,
              middleName: contact.middleName,
            },
            where: { id: personId, userId: user.id },
          }),
        ];
      }),
    );

    updatedCount = updateResults.filter((result) => result.count > 0).length;
  }

  const socialRows = validContacts
    .map((contact) => {
      const handle = contact.instagramUsername.trim().toLowerCase();
      const personId = handleToPersonId.get(handle);
      if (!personId) {
        return null;
      }

      return {
        connectedAt: contact.connectedAt ? new Date(contact.connectedAt) : null,
        handle,
        personId,
        platform: "instagram",
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  await upsertPeopleSocials(db, user.id, socialRows);

  try {
    await Promise.all(
      Array.from(groupAssignments.entries()).map(([groupKey, personIds]) =>
        assignContactsToDefaultImportGroup(ctx, groupKey, Array.from(personIds)),
      ),
    );
  } catch (groupError) {
    const message =
      groupError instanceof Error ? groupError.message : "Failed to assign imported contacts";
    throw internal("import_instagram_failed", message);
  }

  if (importedCount + updatedCount > 0) {
    try {
      await markBulkImportCompleted(ctx);
    } catch (followupError) {
      log?.error({ err: followupError }, "[instagram-import] Failed to mark import completed");
    }
    scheduleMergeRecommendationsRefresh(ctx);
  }

  return {
    importedCount,
    skippedCount,
    updatedCount,
  };
}
