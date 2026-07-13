import type {
  MergeConflictChoice,
  MergeConflictField,
  MergeContactsResponse,
  TablesUpdate,
} from "@bondery/schemas";
import { loadEnrichedContact } from "../../lib/contacts/enrichment.js";
import {
  areValuesEquivalent,
  hasMeaningfulValue,
  MERGEABLE_FIELDS,
  MERGEABLE_SCALAR_FIELDS,
  resolveConflictChoice,
} from "../../lib/contacts/merge-helpers.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import {
  buildContactSnapshotChanges,
  buildPeopleDeleteChange,
} from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
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
  const { client, user, log } = ctx;
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

  const { data: peopleRows, error: peopleError } = await client
    .from("people")
    .select("*")
    .eq("user_id", user.id)
    .in("id", [leftPersonId, rightPersonId]);

  if (peopleError) {
    throw internal("contact_merge_failed", peopleError.message);
  }

  if (peopleRows?.length !== 2) {
    throw new DomainError("One or both contacts were not found", 404, "contact_not_found");
  }

  const leftPerson = peopleRows.find((person) => person.id === leftPersonId);
  const rightPerson = peopleRows.find((person) => person.id === rightPersonId);

  if (!leftPerson || !rightPerson) {
    throw new DomainError("One or both contacts were not found", 404, "contact_not_found");
  }

  const scalarUpdates: TablesUpdate<"people"> = {};

  for (const [field, dbColumn] of Object.entries(MERGEABLE_SCALAR_FIELDS)) {
    const mergeField = field as MergeConflictField;
    const leftValue = (leftPerson as Record<string, unknown>)[dbColumn];
    const rightValue = (rightPerson as Record<string, unknown>)[dbColumn];

    if (!hasMeaningfulValue(rightValue)) {
      continue;
    }

    if (!hasMeaningfulValue(leftValue)) {
      (scalarUpdates as Record<string, unknown>)[dbColumn] = rightValue;
      continue;
    }

    if (areValuesEquivalent(leftValue, rightValue)) {
      continue;
    }

    if (resolveConflictChoice(conflictResolutions, mergeField) === "right") {
      (scalarUpdates as Record<string, unknown>)[dbColumn] = rightValue;
    }
  }

  scalarUpdates.updated_at = new Date().toISOString();

  const { error: updateLeftPersonError } = await client
    .from("people")
    .update(scalarUpdates)
    .eq("id", leftPersonId)
    .eq("user_id", user.id);

  if (updateLeftPersonError) {
    throw internal("contact_merge_failed", updateLeftPersonError.message);
  }

  await mergeContactPhones(client, user.id, leftPersonId, rightPersonId, conflictResolutions);
  await mergeContactEmails(client, user.id, leftPersonId, rightPersonId, conflictResolutions);
  await mergeContactSocials(client, user.id, leftPersonId, rightPersonId, conflictResolutions);
  await mergeContactGroupMemberships(client, user.id, leftPersonId, rightPersonId);
  await mergeContactInteractionParticipants(client, leftPersonId, rightPersonId);
  await mergeContactImportantDates(
    client,
    user.id,
    leftPersonId,
    rightPersonId,
    conflictResolutions,
  );
  await mergeContactRelationships(client, user.id, leftPersonId, rightPersonId);

  const { error: deleteMergedPersonError } = await client
    .from("people")
    .delete()
    .eq("id", rightPersonId)
    .eq("user_id", user.id);

  if (deleteMergedPersonError) {
    throw internal("contact_merge_failed", deleteMergedPersonError.message);
  }

  await mergeContactAvatar(
    client,
    user.id,
    leftPersonId,
    rightPersonId,
    leftPerson.has_avatar,
    rightPerson.has_avatar,
    conflictResolutions,
  );

  const contact = await loadEnrichedContact(client, user.id, leftPersonId, undefined, log);

  const response: MergeContactsResponse = {
    contact,
    mergedFromPersonId: rightPersonId,
    mergedIntoPersonId: leftPersonId,
    personId: leftPersonId,
    userId: user.id,
  };

  const snapshotChanges = await buildContactSnapshotChanges(client, user.id, leftPersonId);
  const changes = [...snapshotChanges, buildPeopleDeleteChange(rightPersonId)];
  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  scheduleMergeRecommendationsRefresh(ctx);

  return { data: response, serverSequence, txid };
}
