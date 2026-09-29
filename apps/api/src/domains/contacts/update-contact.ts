import type { Contact, UpdateContactInput } from "@bondery/schemas";
import type { SyncChange } from "@bondery/schemas/sync";
import { loadEnrichedContact } from "../../lib/contacts/enrichment.js";
import {
  buildChildTableReplaceChanges,
  buildPeopleRowChange,
} from "../../lib/sync/build-changes.js";
import { checkContactUpdateConflict } from "../../lib/sync/conflict.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { toSyncRow } from "../_shared/prisma-helpers.js";
import { withPersonTxid } from "../_shared/with-txid.js";
import { applyContactPatch } from "./apply-contact-patch.js";
import {
  patchAffectsMergeRecommendations,
  scheduleMergeRecommendationsRefresh,
} from "./merge-recommendations.js";

export interface UpdateContactDomainInput {
  baseUpdatedAt?: string;
  patch: UpdateContactInput;
  personId: string;
}

export async function updateContact(
  ctx: DomainContext,
  input: UpdateContactDomainInput,
): Promise<{ data: { contact: Contact; personId: string }; txid: string; serverSequence: number }> {
  const { user, log } = ctx;
  const db = domainDb(ctx);
  const { personId, patch: body, baseUpdatedAt } = input;

  if (baseUpdatedAt) {
    await checkContactUpdateConflict(db, user.id, personId, baseUpdatedAt);
  }

  const applied = await applyContactPatch(ctx, personId, body);

  const enrichedContact = await loadEnrichedContact(db, user.id, personId, undefined, log);

  if (!enrichedContact) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  const { txid } = await withPersonTxid(user.id, async () => ({ personId }));

  const changes: SyncChange[] = [];
  const peopleChange = await buildPeopleRowChange(user.id, personId, db);
  if (peopleChange) {
    changes.push(peopleChange);
  }

  if (applied.priorPhoneIds) {
    changes.push(
      ...(await buildChildTableReplaceChanges(
        user.id,
        personId,
        "people_phones",
        applied.priorPhoneIds,
        db,
      )),
    );
  }

  if (applied.priorEmailIds) {
    changes.push(
      ...(await buildChildTableReplaceChanges(
        user.id,
        personId,
        "people_emails",
        applied.priorEmailIds,
        db,
      )),
    );
  }

  if (applied.priorAddressIds) {
    changes.push(
      ...(await buildChildTableReplaceChanges(
        user.id,
        personId,
        "people_addresses",
        applied.priorAddressIds,
        db,
      )),
    );
  }

  if (applied.socialsUpdated) {
    const socialRows = await db.peopleSocial.findMany({
      where: { personId, userId: user.id },
    });

    for (const row of socialRows) {
      changes.push({
        entityId: row.id,
        operation: "update",
        table: "people_socials",
        value: toSyncRow(row as unknown as Record<string, unknown>),
      });
    }
  }

  const serverSequence = await emitSyncBatch(user.id, changes, syncEmitMetaFromContext(ctx));

  if (patchAffectsMergeRecommendations(body)) {
    scheduleMergeRecommendationsRefresh(ctx);
  }

  return {
    data: { contact: enrichedContact, personId },
    serverSequence: serverSequence ?? 0,
    txid,
  };
}
