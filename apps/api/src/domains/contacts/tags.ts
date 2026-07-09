import type { Tag } from "@bondery/schemas";
import type { DomainContext } from "../_shared/context.js";
import { removePeopleTagMembership, upsertPeopleTagMembership } from "../_shared/people-tags.js";

export async function addContactTag(
  ctx: DomainContext,
  personId: string,
  tagId: string,
): Promise<{ data: { tag: Tag; personId: string }; txid: string; serverSequence: number }> {
  const result = await upsertPeopleTagMembership(ctx, personId, tagId);
  return {
    data: { personId: result.personId, tag: result.tag },
    serverSequence: result.serverSequence,
    txid: result.txid,
  };
}

export async function removeContactTag(
  ctx: DomainContext,
  personId: string,
  tagId: string,
): Promise<{ data: { personId: string; tagId: string }; txid: string; serverSequence: number }> {
  const result = await removePeopleTagMembership(ctx, personId, tagId);
  return {
    data: { personId: result.personId, tagId: result.tagId },
    serverSequence: result.serverSequence,
    txid: result.txid,
  };
}
