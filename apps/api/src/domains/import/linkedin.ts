import type { PrismaClient } from "@bondery/db";
import type { LinkedInImportCommitResponse } from "@bondery/schemas";
import { assignContactsToDefaultImportGroup } from "../../lib/import/default-groups.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { markBulkImportCompleted } from "../../services/import/followup.js";
import type { DomainContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { scheduleMergeRecommendationsRefresh } from "../contacts/merge-recommendations.js";

function buildImportedTitle(position: string | null, company: string | null): string | null {
  const normalizedPosition = typeof position === "string" ? position.trim() : "";
  const normalizedCompany = typeof company === "string" ? company.trim() : "";
  if (normalizedPosition && normalizedCompany) {
    return `${normalizedPosition} @${normalizedCompany}`;
  }
  if (normalizedPosition) {
    return normalizedPosition;
  }
  if (normalizedCompany) {
    return `@${normalizedCompany}`;
  }
  return null;
}

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

export async function commitLinkedInImport(
  ctx: DomainContext,
  rawImportContacts: Array<{
    isValid: boolean;
    linkedinUsername: string;
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
    position?: string | null;
    company?: string | null;
    email?: string | null;
    connectedAt?: string | null;
  }>,
): Promise<LinkedInImportCommitResponse> {
  const { user, log } = ctx;
  const db = domainDb(ctx);
  const rawContacts = rawImportContacts;

  const seenHandles = new Set<string>();
  const validContacts = rawContacts.filter((contact) => {
    if (!contact.isValid || !contact.linkedinUsername) {
      return false;
    }
    const handle = contact.linkedinUsername.trim();
    if (!handle || seenHandles.has(handle)) {
      return false;
    }
    seenHandles.add(handle);
    return true;
  });

  const skippedCount = rawContacts.length - validContacts.length;

  if (validContacts.length === 0) {
    return {
      importedCount: 0,
      skippedCount,
      updatedCount: 0,
    } satisfies LinkedInImportCommitResponse;
  }

  const now = new Date();
  const handles = validContacts.map((contact) => contact.linkedinUsername.trim());

  const existingSocialRows = await db.peopleSocial.findMany({
    select: { handle: true, personId: true },
    where: {
      handle: { in: handles },
      platform: "linkedin",
      userId: user.id,
    },
  });

  const handleToPersonId = new Map<string, string>();
  for (const row of existingSocialRows) {
    if (!row.handle || !row.personId) {
      continue;
    }

    let decodedHandle: string;
    try {
      decodedHandle = decodeURIComponent(row.handle.trim());
    } catch {
      decodedHandle = row.handle.trim();
    }
    handleToPersonId.set(decodedHandle, row.personId);
  }

  const toInsert = validContacts.filter(
    (contact) => !handleToPersonId.has(contact.linkedinUsername.trim()),
  );
  const toUpdate = validContacts.filter((contact) =>
    handleToPersonId.has(contact.linkedinUsername.trim()),
  );

  let importedCount = 0;
  let importedPersonIds: string[] = [];

  if (toInsert.length > 0) {
    const insertedPeople = await db.people.createManyAndReturn({
      data: toInsert.map((contact) => ({
        firstName: contact.firstName,
        headline: buildImportedTitle(contact.position ?? null, contact.company ?? null),
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
        handleToPersonId.set(contact.linkedinUsername.trim(), inserted.id);
      }
    }

    importedCount = insertedPeople.length;
    importedPersonIds = insertedPeople.map((person) => person.id);
  }

  let updatedCount = 0;

  if (toUpdate.length > 0) {
    const updateResults = await Promise.all(
      toUpdate.flatMap((contact) => {
        const personId = handleToPersonId.get(contact.linkedinUsername.trim());
        if (!personId) {
          return [];
        }

        return [
          db.people.updateMany({
            data: {
              firstName: contact.firstName,
              headline: buildImportedTitle(contact.position ?? null, contact.company ?? null),
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
      const personId = handleToPersonId.get(contact.linkedinUsername.trim());
      if (!personId) {
        return null;
      }

      return {
        connectedAt: contact.connectedAt ? new Date(contact.connectedAt) : null,
        handle: contact.linkedinUsername.trim(),
        personId,
        platform: "linkedin",
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  await upsertPeopleSocials(db, user.id, socialRows);

  const validContactsWithEmail = validContacts.filter((contact) => contact.email);

  if (validContactsWithEmail.length > 0) {
    const personIds = validContactsWithEmail
      .map((contact) => handleToPersonId.get(contact.linkedinUsername.trim()))
      .filter((id): id is string => Boolean(id));

    const existingEmails = await db.peopleEmail.findMany({
      select: { personId: true, value: true },
      where: { personId: { in: personIds }, userId: user.id },
    });

    const existingEmailsByPerson = new Map<string, string[]>();
    for (const row of existingEmails) {
      const list = existingEmailsByPerson.get(row.personId) ?? [];
      list.push(row.value.trim().toLowerCase());
      existingEmailsByPerson.set(row.personId, list);
    }

    const emailRowsToInsert = validContactsWithEmail
      .map((contact) => {
        const personId = handleToPersonId.get(contact.linkedinUsername.trim());
        if (!personId || !contact.email) {
          return null;
        }

        const existing = existingEmailsByPerson.get(personId) ?? [];
        if (existing.includes(contact.email.trim().toLowerCase())) {
          return null;
        }

        return {
          personId,
          preferred: existing.length === 0,
          sortOrder: existing.length,
          type: "work",
          userId: user.id,
          value: contact.email,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (emailRowsToInsert.length > 0) {
      await db.peopleEmail.createMany({
        data: emailRowsToInsert,
        skipDuplicates: true,
      });
    }
  }

  try {
    await assignContactsToDefaultImportGroup(ctx, "linkedin_import", importedPersonIds);
  } catch (groupError) {
    const message =
      groupError instanceof Error ? groupError.message : "Failed to assign imported contacts";
    throw internal("import_linkedin_failed", message);
  }

  if (importedCount + updatedCount > 0) {
    try {
      await markBulkImportCompleted(ctx);
    } catch (followupError) {
      log?.error({ err: followupError }, "[linkedin-import] Failed to mark import completed");
    }
    scheduleMergeRecommendationsRefresh(ctx);
  }

  return {
    importedCount,
    skippedCount,
    updatedCount,
  };
}
