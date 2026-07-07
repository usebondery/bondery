import type { Tag } from "@bondery/schemas";
import { TAG_SELECT } from "../../lib/queries.js";
import { withPersonTxid } from "../_shared/with-txid.js";
import { DomainError, syncEmitMetaFromContext, type DomainContext } from "../_shared/context.js";
import {
  buildPeopleTagChange,
  findPeopleTagId,
} from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";

export async function addContactTag(
  ctx: DomainContext,
  personId: string,
  tagId: string,
): Promise<{ data: { tag: Tag; personId: string }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const { error } = await client.from("people_tags").upsert(
    { person_id: personId, tag_id: tagId, user_id: user.id },
    { onConflict: "person_id,tag_id", ignoreDuplicates: true },
  );

  if (error) {
    throw new DomainError(error.message, 500);
  }

  const { data: tag, error: tagError } = await client
    .from("tags")
    .select(TAG_SELECT)
    .eq("id", tagId)
    .eq("user_id", user.id)
    .single();

  if (tagError || !tag) {
    throw new DomainError("Tag not found", 404);
  }

  const { txid } = await withPersonTxid(client, user.id, async () => ({ personId }));
  const tagChange = await buildPeopleTagChange(client, user.id, personId, tagId);
  const changes = tagChange ? [tagChange] : [];
  const serverSequence = (await emitSyncBatch(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;
  return { data: { tag: tag as Tag, personId }, txid, serverSequence };
}

export async function removeContactTag(
  ctx: DomainContext,
  personId: string,
  tagId: string,
): Promise<{ data: { personId: string; tagId: string }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const peopleTagId = await findPeopleTagId(client, user.id, personId, tagId);

  const { error } = await client
    .from("people_tags")
    .delete()
    .eq("person_id", personId)
    .eq("tag_id", tagId)
    .eq("user_id", user.id);

  if (error) {
    throw new DomainError(error.message, 500);
  }

  const { txid } = await withPersonTxid(client, user.id, async () => ({ personId }));
  const changes =
    peopleTagId ?
      [{ table: "people_tags" as const, operation: "delete" as const, entityId: peopleTagId, value: null }]
    : [];
  const serverSequence = (await emitSyncBatch(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;
  return { data: { personId, tagId }, txid, serverSequence };
}
