import type { DomainSupabaseClient } from "../../domains/_shared/context";
import { DomainError } from "../../domains/_shared/context";
import { loadEnrichedContact } from "../contact-enrichment";

export class SyncConflictError extends DomainError {
  constructor(
    message: string,
    readonly serverContact: NonNullable<Awaited<ReturnType<typeof loadEnrichedContact>>>,
  ) {
    super(message, 409, "SYNC_CONFLICT");
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
    throw new DomainError(error.message, 500);
  }

  if (!data) {
    throw new DomainError("Contact not found", 404);
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
      throw new DomainError("Contact not found", 404);
    }
    throw new SyncConflictError("Contact was modified on another device", serverContact);
  }
}
