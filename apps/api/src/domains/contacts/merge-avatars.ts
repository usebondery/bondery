import type { MergeAvatarIdentityResponse } from "@bondery/schemas";
import { areContactAvatarFilesIdentical } from "../../lib/contacts/avatar-storage.js";
import { type DomainContext, DomainError } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";

export async function getMergeAvatarIdentity(
  ctx: DomainContext,
  leftPersonId: string,
  rightPersonId: string,
): Promise<MergeAvatarIdentityResponse> {
  if (leftPersonId === rightPersonId) {
    throw new DomainError("Cannot merge the same contact", 400, "contact_merge_same_contact");
  }

  const db = domainDb(ctx);
  const people = await db.people.findMany({
    select: { hasAvatar: true, id: true },
    where: { id: { in: [leftPersonId, rightPersonId] }, userId: ctx.user.id },
  });

  const left = people.find((person) => person.id === leftPersonId);
  const right = people.find((person) => person.id === rightPersonId);
  if (!left || !right) {
    throw new DomainError("One or both contacts were not found", 404, "contact_not_found");
  }

  if (!left.hasAvatar || !right.hasAvatar) {
    return { identical: false };
  }

  return {
    identical: await areContactAvatarFilesIdentical(ctx.user.id, leftPersonId, rightPersonId),
  };
}
