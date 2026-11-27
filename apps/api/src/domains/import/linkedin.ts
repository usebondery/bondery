import type { LinkedInImportCommitResponse } from "@bondery/schemas";
import { assignContactsToDefaultImportGroup } from "../../lib/import/default-groups.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { type SyncedWrite, withSyncedWrite } from "../../lib/sync/synced-write.js";
import { markBulkImportCompleted } from "../../services/import/followup.js";
import type { DomainContext } from "../_shared/context.js";
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

/** Create or update one social row per person and platform. Every touched id is recorded. */
async function upsertPeopleSocials(
  sw: SyncedWrite,
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
  const { db, userId } = sw;

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
    const created = await db.peopleSocial.createManyAndReturn({
      data: toCreate.map((row) => ({
        connectedAt: row.connectedAt,
        handle: row.handle,
        personId: row.personId,
        platform: row.platform,
        userId,
      })),
      select: { id: true },
      skipDuplicates: true,
    });
    sw.touch(
      "people_socials",
      created.map((row) => row.id),
    );
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
  sw.touch("people_socials", existingByKey.values());
}

type LinkedInImportContact = {
  isValid: boolean;
  linkedinUsername: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  position?: string | null;
  company?: string | null;
  email?: string | null;
  connectedAt?: string | null;
};

const LINKEDIN_IMPORT_TRANSACTION_TIMEOUT_MS = 120_000;

/** Insert new people, update known ones, and upsert socials and emails. Records every row. */
async function writeLinkedInImport(
  sw: SyncedWrite,
  validContacts: LinkedInImportContact[],
): Promise<{ importedCount: number; updatedCount: number }> {
  const { db, userId } = sw;
  const now = new Date();
  const handles = validContacts.map((contact) => contact.linkedinUsername.trim());

  const existingSocialRows = await db.peopleSocial.findMany({
    select: { handle: true, personId: true },
    where: {
      handle: { in: handles },
      platform: "linkedin",
      userId,
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
  const importedPersonIds: string[] = [];

  if (toInsert.length > 0) {
    const insertedPeople = await db.people.createManyAndReturn({
      data: toInsert.map((contact) => ({
        firstName: contact.firstName,
        headline: buildImportedTitle(contact.position ?? null, contact.company ?? null),
        lastInteraction: now,
        lastName: contact.lastName,
        middleName: contact.middleName,
        myself: false,
        userId,
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
    importedPersonIds.push(...insertedPeople.map((person) => person.id));
    sw.touch("people", importedPersonIds);
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
            where: { id: personId, userId },
          }),
        ];
      }),
    );

    updatedCount = updateResults.filter((result) => result.count > 0).length;
    sw.touch(
      "people",
      toUpdate.flatMap((contact) => handleToPersonId.get(contact.linkedinUsername.trim()) ?? []),
    );
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

  await upsertPeopleSocials(sw, socialRows);

  const validContactsWithEmail = validContacts.filter((contact) => contact.email);

  if (validContactsWithEmail.length > 0) {
    const personIds = validContactsWithEmail
      .map((contact) => handleToPersonId.get(contact.linkedinUsername.trim()))
      .filter((id): id is string => Boolean(id));

    const existingEmails = await db.peopleEmail.findMany({
      select: { personId: true, value: true },
      where: { personId: { in: personIds }, userId },
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
          userId,
          value: contact.email,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (emailRowsToInsert.length > 0) {
      const createdEmails = await db.peopleEmail.createManyAndReturn({
        data: emailRowsToInsert,
        select: { id: true },
        skipDuplicates: true,
      });
      sw.touch(
        "people_emails",
        createdEmails.map((row) => row.id),
      );
    }
  }

  await assignContactsToDefaultImportGroup(sw, "linkedin_import", importedPersonIds);

  return { importedCount, updatedCount };
}

export async function commitLinkedInImport(
  ctx: DomainContext,
  rawImportContacts: LinkedInImportContact[],
): Promise<LinkedInImportCommitResponse> {
  const { log } = ctx;
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

  let counts: { importedCount: number; updatedCount: number };
  try {
    counts = await withSyncedWrite(ctx, (sw) => writeLinkedInImport(sw, validContacts), {
      timeoutMs: LINKEDIN_IMPORT_TRANSACTION_TIMEOUT_MS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import contacts";
    throw internal("import_linkedin_failed", message);
  }
  const { importedCount, updatedCount } = counts;

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
