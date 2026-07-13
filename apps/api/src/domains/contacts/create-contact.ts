import type {
  Contact,
  CreateContactInput as CreateContactPayload,
  TablesInsert,
} from "@bondery/schemas";
import { loadEnrichedContact } from "../../lib/contacts/enrichment.js";
import { upsertContactSocials } from "../../lib/contacts/socials.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildContactSnapshotChanges } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, syncEmitMetaFromContext } from "../_shared/context.js";
import { withPersonTxid } from "../_shared/with-txid.js";

export interface CreateContactDomainInput extends CreateContactPayload {
  id?: string;
}

export async function createContact(
  ctx: DomainContext,
  input: CreateContactDomainInput,
): Promise<{ data: { contact: Contact; personId: string }; txid: string; serverSequence: number }> {
  const { client, user, log } = ctx;

  const insertData: TablesInsert<"people"> = {
    first_name: input.firstName.trim(),
    last_interaction: new Date().toISOString(),
    myself: false,
    user_id: user.id,
  };

  if (input.id) {
    insertData.id = input.id;
  }

  if (input.lastName && input.lastName.trim().length > 0) {
    insertData.last_name = input.lastName.trim();
  }

  if (input.middleName && input.middleName.trim().length > 0) {
    insertData.middle_name = input.middleName.trim();
  }

  const { data: newContact, error } = await client
    .from("people")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    throw internal("contact_failed", error.message);
  }

  if (input.linkedin && input.linkedin.trim().length > 0) {
    try {
      await upsertContactSocials(client, user.id, newContact.id, "linkedin", input.linkedin);
    } catch (socialError) {
      const message = socialError instanceof Error ? socialError.message : "Social upsert failed";
      throw internal("contact_failed", message);
    }
  }

  const contact = await loadEnrichedContact(client, user.id, newContact.id, undefined, log);

  if (!contact) {
    throw internal("contact_contact_was_created_but_could_not_be_rel");
  }

  const { txid } = await withPersonTxid(client, user.id, async () => ({ personId: newContact.id }));

  const changes = await buildContactSnapshotChanges(client, user.id, newContact.id);
  const serverSequence = await emitSyncBatch(user.id, changes, syncEmitMetaFromContext(ctx));

  return {
    data: { contact, personId: newContact.id },
    serverSequence: serverSequence ?? 0,
    txid,
  };
}
