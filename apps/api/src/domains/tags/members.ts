import type { DomainContext } from "../_shared/context.js";
import { removePeopleTagMemberships, upsertPeopleTagMemberships } from "../_shared/people-tags.js";

export async function addTagMembers(
  ctx: DomainContext,
  tagId: string,
  personIds: string[],
): Promise<{ data: { addedCount: number }; txid: string; serverSequence: number }> {
  const result = await upsertPeopleTagMemberships(ctx, tagId, personIds);
  return {
    data: { addedCount: result.addedCount },
    serverSequence: result.serverSequence,
    txid: result.txid,
  };
}

export async function removeTagMembers(
  ctx: DomainContext,
  tagId: string,
  personIds: string[],
): Promise<{ data: { removedCount: number }; txid: string; serverSequence: number }> {
  const result = await removePeopleTagMemberships(ctx, tagId, personIds);
  return {
    data: { removedCount: result.removedCount },
    serverSequence: result.serverSequence,
    txid: result.txid,
  };
}
