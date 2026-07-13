import type { DomainSupabaseClient } from "../../domains/_shared/context.js";
import { DomainError } from "../../domains/_shared/context.js";
import { loadEnrichedContact } from "../contacts/enrichment.js";
import { internal } from "../platform/errors/http-errors.js";

export class SyncConflictError extends DomainError {
  constructor(
    message: string,
    readonly serverContact: NonNullable<Awaited<ReturnType<typeof loadEnrichedContact>>>,
  ) {
    super(message, 409, "sync_conflict");
    this.name = "SyncConflictError";
  }
}

export async function checkContactUpdateConflict(
  client: DomainSupabaseClient,
  userId: string,
  personId: string,
  baseUpdatedAt: string,
): Promise<void> {
  const { data, error } = await client
    .from("people")
    .select("updated_at")
    .eq("id", personId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw internal("sync_failed", error.message);
  }

  if (!data) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  const serverUpdatedAt = data.updated_at;
  if (!serverUpdatedAt) {
    return;
  }

  const baseMs = Date.parse(baseUpdatedAt);
  const serverMs = Date.parse(serverUpdatedAt);

  if (Number.isNaN(baseMs) || Number.isNaN(serverMs)) {
    return;
  }

  if (serverMs > baseMs) {
    const serverContact = await loadEnrichedContact(client, userId, personId);
    if (!serverContact) {
      throw new DomainError("Contact not found", 404, "contact_not_found");
    }
    throw new SyncConflictError("Contact was modified on another device", serverContact);
  }
}
