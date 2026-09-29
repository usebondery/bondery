import { type DomainContext, DomainError } from "./context.js";
import { domainDb } from "./domain-db.js";

/**
 * Fail closed: every id must belong to the authenticated user.
 * Foreign and missing contacts are indistinguishable (404).
 */
export async function assertOwnedPersonIds(ctx: DomainContext, personIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(personIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const db = domainDb(ctx);
  const ownedCount = await db.people.count({
    where: { id: { in: uniqueIds }, userId: ctx.user.id },
  });

  if (ownedCount !== uniqueIds.length) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }
}
