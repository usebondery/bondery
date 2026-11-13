import type { Prisma } from "@bondery/db";
import type {
  MergeConflictChoice,
  MergeConflictField,
  MergeContactsResponse,
} from "@bondery/schemas";
import { loadEnrichedContact } from "../../lib/contacts/enrichment.js";
import {
  areValuesEquivalent,
  hasMeaningfulValue,
  MERGEABLE_FIELDS,
  MERGEABLE_SCALAR_FIELDS,
  resolveConflictChoice,
} from "../../lib/contacts/merge-helpers.js";
import { lookupMergePeople } from "../../lib/contacts/merge-people-lookup.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import {
  buildContactSnapshotChanges,
  buildPeopleDeleteChange,
} from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { toSyncRow } from "../_shared/prisma-helpers.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";
import { mergeContactEmails, mergeContactPhones } from "./merge-channels.js";
import { scheduleMergeRecommendationsRefresh } from "./merge-recommendations.js";
import {
  mergeContactAvatar,
  mergeContactGroupMemberships,
  mergeContactImportantDates,
  mergeContactInteractionParticipants,
  mergeContactRelationships,
  mergeContactSocials,
} from "./merge-related-data.js";

export interface MergeContactsInput {
  conflictResolutions?: Partial<Record<MergeConflictField, MergeConflictChoice>>;
  leftPersonId: string;
  rightPersonId: string;
}

export async function mergeContacts(
  ctx: DomainContext,
  input: MergeContactsInput,
): Promise<{ data: MergeContactsResponse; txid: string; serverSequence: number }> {
  const { user, log } = ctx;
  const db = domainDb(ctx);
  const leftPersonId = input.leftPersonId.trim();
  const rightPersonId = input.rightPersonId.trim();
  const conflictResolutions = input.conflictResolutions ?? {};

  if (leftPersonId === rightPersonId) {
    throw new DomainError("Cannot merge the same contact", 400, "contact_merge_same_contact");
  }

  for (const [field, choice] of Object.entries(conflictResolutions)) {
    if (!MERGEABLE_FIELDS.has(field as MergeConflictField)) {
      throw new DomainError(`Unsupported conflict field: ${field}`, 400, "contact_merge_invalid");
    }
    if (choice !== "left" && choice !== "right") {
      throw new DomainError(
        `Invalid conflict choice for field: ${field}`,
        400,
        "contact_merge_invalid",
      );
    }
  }

  const peopleRows = await db.people.findMany({
    where: { id: { in: [leftPersonId, rightPersonId] }, userId: user.id },
  });

  const mergePeople = lookupMergePeople(peopleRows, leftPersonId, rightPersonId);

  if (mergePeople.status === "not_found") {
    throw new DomainError("One or both contacts were not found", 404, "contact_not_found");
  }

  if (mergePeople.status === "already_merged") {
    const survivorId = mergePeople.survivor.id;
    const contact = await loadEnrichedContact(db, user.id, survivorId, undefined, log);
    const txid = await captureCurrentSyncTxid();
    return {
      data: {
        contact,
        mergedFromPersonId: mergePeople.mergedFromPersonId,
        mergedIntoPersonId: survivorId,
        personId: survivorId,
        userId: user.id,
      },
      serverSequence: 0,
      txid,
    };
  }

  const { leftPerson, rightPerson } = mergePeople;

  const leftPersonSync = toSyncRow(leftPerson as unknown as Record<string, unknown>);
  const rightPersonSync = toSyncRow(rightPerson as unknown as Record<string, unknown>);

  const scalarUpdates: Prisma.PeopleUpdateManyMutationInput = {};
  let gisPointEwkt: string | null | undefined;

  for (const [field, dbColumn] of Object.entries(MERGEABLE_SCALAR_FIELDS)) {
    const mergeField = field as MergeConflictField;
    const leftValue = leftPersonSync[dbColumn];
    const rightValue = rightPersonSync[dbColumn];

    if (!hasMeaningfulValue(rightValue)) {
      continue;
    }

    if (!hasMeaningfulValue(leftValue)) {
      if (mergeField === "gisPoint") {
        gisPointEwkt = rightValue as string;
      } else {
        (scalarUpdates as Record<string, unknown>)[field] = rightValue;
      }
      continue;
    }

    if (areValuesEquivalent(leftValue, rightValue)) {
      continue;
    }

    if (resolveConflictChoice(conflictResolutions, mergeField) === "right") {
      if (mergeField === "gisPoint") {
        gisPointEwkt = rightValue as string;
      } else {
        (scalarUpdates as Record<string, unknown>)[field] = rightValue;
      }
    }
  }

  scalarUpdates.updatedAt = new Date();

  try {
    const updated = await db.people.updateMany({
      data: scalarUpdates,
      where: { id: leftPersonId, userId: user.id },
    });

    if (updated.count === 0) {
      throw internal("contact_merge_failed", "Failed to update merged contact");
    }

    if (gisPointEwkt !== undefined) {
      if (gisPointEwkt) {
        await db.$executeRaw`
          UPDATE people
          SET "gisPoint" = ST_GeogFromText(${gisPointEwkt}),
              updated_at = NOW()
          WHERE id = ${leftPersonId}::uuid AND user_id = ${user.id}::uuid
        `;
      } else {
        await db.$executeRaw`
          UPDATE people
          SET "gisPoint" = NULL,
              updated_at = NOW()
          WHERE id = ${leftPersonId}::uuid AND user_id = ${user.id}::uuid
        `;
      }
    }
  } catch (error) {
    throw internal(
      "contact_merge_failed",
      error instanceof Error ? error.message : "contact_merge_failed",
    );
  }

  await mergeContactPhones(db, user.id, leftPersonId, rightPersonId, conflictResolutions);
  await mergeContactEmails(db, user.id, leftPersonId, rightPersonId, conflictResolutions);
  await mergeContactSocials(db, user.id, leftPersonId, rightPersonId, conflictResolutions);
  await mergeContactGroupMemberships(db, user.id, leftPersonId, rightPersonId);
  await mergeContactInteractionParticipants(db, leftPersonId, rightPersonId);
  await mergeContactImportantDates(db, user.id, leftPersonId, rightPersonId, conflictResolutions);
  await mergeContactRelationships(db, user.id, leftPersonId, rightPersonId);

  await mergeContactAvatar(
    db,
    user.id,
    leftPersonId,
    rightPersonId,
    leftPerson.hasAvatar,
    rightPerson.hasAvatar,
    conflictResolutions,
  );

  const deleted = await db.people.deleteMany({
    where: { id: rightPersonId, userId: user.id },
  });

  if (deleted.count === 0) {
    throw internal("contact_merge_failed", "Failed to delete merged contact");
  }

  const contact = await loadEnrichedContact(db, user.id, leftPersonId, undefined, log);

  const response: MergeContactsResponse = {
    contact,
    mergedFromPersonId: rightPersonId,
    mergedIntoPersonId: leftPersonId,
    personId: leftPersonId,
    userId: user.id,
  };

  const txid = await captureCurrentSyncTxid();
  let serverSequence = 0;
  try {
    const snapshotChanges = await buildContactSnapshotChanges(user.id, leftPersonId, db);
    const changes = [...snapshotChanges, buildPeopleDeleteChange(rightPersonId)];
    serverSequence =
      (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;
  } catch (error) {
    log?.error({ err: error }, "Failed to persist sync changes after contact merge");
  }

  scheduleMergeRecommendationsRefresh(ctx);

  return { data: response, serverSequence, txid };
}
