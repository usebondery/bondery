import type { PrismaClient } from "@bondery/db";
import { DomainError } from "../../domains/_shared/context.js";
import { loadEnrichedContact } from "../contacts/enrichment.js";

export class SyncConflictError extends DomainError {
  readonly serverContact: NonNullable<Awaited<ReturnType<typeof loadEnrichedContact>>>;

  constructor(
    message: string,
    serverContact: NonNullable<Awaited<ReturnType<typeof loadEnrichedContact>>>,
  ) {
    super(message, 409, "sync_conflict");
    this.name = "SyncConflictError";
    this.serverContact = serverContact;
  }
}

export async function checkContactUpdateConflict(
  db: PrismaClient,
  userId: string,
  personId: string,
  baseUpdatedAt: string,
): Promise<void> {
  const person = await db.people.findFirst({
    select: { updatedAt: true },
    where: { id: personId, userId },
  });

  if (!person) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  const serverUpdatedAt = person.updatedAt.toISOString();

  const baseMs = Date.parse(baseUpdatedAt);
  const serverMs = Date.parse(serverUpdatedAt);

  if (Number.isNaN(baseMs) || Number.isNaN(serverMs)) {
    return;
  }

  if (serverMs > baseMs) {
    const serverContact = await loadEnrichedContact(db, userId, personId);
    if (!serverContact) {
      throw new DomainError("Contact not found", 404, "contact_not_found");
    }
    throw new SyncConflictError("Contact was modified on another device", serverContact);
  }
}
