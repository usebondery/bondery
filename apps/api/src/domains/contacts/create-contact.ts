import type { Contact, CreateContactInput as CreateContactPayload, TablesInsert } from "@bondery/schemas";
import { loadEnrichedContact } from "../../lib/contact-enrichment";
import { upsertContactSocials } from "../../lib/socials";
import { buildContactSnapshotChanges } from "../../lib/sync/build-changes";
import { emitSyncBatch } from "../../lib/sync/emit-change";
import { withPersonTxid } from "../_shared/with-txid";
import { DomainError, type DomainContext } from "../_shared/context";

export interface CreateContactDomainInput extends CreateContactPayload {
  id?: string;
}

export async function createContact(
  ctx: DomainContext,
  input: CreateContactDomainInput,
): Promise<{ data: { contact: Contact; personId: string }; txid: string; serverSequence: number }> {
  const { client, user, log } = ctx;

  const insertData: TablesInsert<"people"> = {
    user_id: user.id,
    first_name: input.firstName.trim(),
    last_interaction: new Date().toISOString(),
    myself: false,
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
    throw new DomainError(error.message, 500);
  }

  if (input.linkedin && input.linkedin.trim().length > 0) {
    try {
      await upsertContactSocials(
        client,
        user.id,
        newContact.id,
        "linkedin",
        input.linkedin,
      );
    } catch (socialError) {
      const message =
        socialError instanceof Error ? socialError.message : "Social upsert failed";
      throw new DomainError(message, 500);
    }
  }

  const contact = await loadEnrichedContact(
    client,
    user.id,
    newContact.id,
    undefined,
    log,
  );

  if (!contact) {
    throw new DomainError("Contact was created but could not be reloaded", 500);
  }

  const { txid } = await withPersonTxid(
    client,
    user.id,
    async () => ({ personId: newContact.id }),
  );

  const changes = await buildContactSnapshotChanges(client, user.id, newContact.id);
  const serverSequence = await emitSyncBatch(user.id, changes);

  return {
    data: { contact, personId: newContact.id },
    txid,
    serverSequence: serverSequence ?? 0,
  };
}
