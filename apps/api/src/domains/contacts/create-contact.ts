import type { Contact, CreateContactInput as CreateContactPayload } from "@bondery/schemas";
import { loadEnrichedContact } from "../../lib/contacts/enrichment.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildContactSnapshotChanges } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { maybeCaptureActivation } from "../../services/analytics/maybe-capture-activation.js";
import { type DomainContext, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { withPersonTxid } from "../_shared/with-txid.js";
import { applyContactPatch } from "./apply-contact-patch.js";

export interface CreateContactDomainInput extends CreateContactPayload {
  id?: string;
}

const CREATE_INSERT_KEYS = new Set(["id", "firstName", "lastName", "middleName"]);

export function contactCreateHasExtras(input: CreateContactDomainInput): boolean {
  return Object.entries(input).some(
    ([key, value]) => !CREATE_INSERT_KEYS.has(key) && value !== undefined,
  );
}

export async function createContact(
  ctx: DomainContext,
  input: CreateContactDomainInput,
): Promise<{ data: { contact: Contact; personId: string }; txid: string; serverSequence: number }> {
  const { user, log } = ctx;
  const db = domainDb(ctx);

  let newContact: { id: string };
  try {
    newContact = await db.people.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        firstName: input.firstName.trim(),
        lastInteraction:
          input.lastInteraction !== undefined && input.lastInteraction
            ? new Date(input.lastInteraction)
            : new Date(),
        myself: false,
        userId: user.id,
        ...(input.lastName && input.lastName.trim().length > 0
          ? { lastName: input.lastName.trim() }
          : {}),
        ...(input.middleName && input.middleName.trim().length > 0
          ? { middleName: input.middleName.trim() }
          : {}),
      },
      select: { id: true },
    });
  } catch (error) {
    throw internal("contact_failed", error instanceof Error ? error.message : "contact_failed");
  }

  if (contactCreateHasExtras(input)) {
    const { id: _clientId, ...writable } = input;
    await applyContactPatch(ctx, newContact.id, writable);
  }

  const contact = await loadEnrichedContact(db, user.id, newContact.id, undefined, log);

  if (!contact) {
    throw internal("contact_contact_was_created_but_could_not_be_rel");
  }

  const { txid } = await withPersonTxid(user.id, async () => ({ personId: newContact.id }));

  const changes = await buildContactSnapshotChanges(user.id, newContact.id, db);
  const serverSequence = await emitSyncBatch(user.id, changes, syncEmitMetaFromContext(ctx));

  void maybeCaptureActivation(ctx, "first_contact");

  return {
    data: { contact, personId: newContact.id },
    serverSequence: serverSequence ?? 0,
    txid,
  };
}
