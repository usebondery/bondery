import type { Tag } from "@bondery/schemas";
import { TAG_SELECT } from "../../lib/data/select-fragments.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import {
  buildPeopleTagChange,
  buildPeopleTagChangeFromRow,
  findPeopleTagId,
} from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "./context.js";
import { captureCurrentSyncTxid, withPersonTxid } from "./with-txid.js";

const PEOPLE_TAG_WITH_TAG_SELECT = `
  id,
  person_id,
  tag_id,
  user_id,
  created_at,
  tags!inner(${TAG_SELECT})
`;

type PeopleTagMembershipRow = {
  id: string;
  person_id: string;
  tag_id: string;
  user_id: string;
  created_at: string;
  tags: Tag;
};

function toPeopleTagSyncRow(membership: PeopleTagMembershipRow) {
  const { tags: _tags, ...peopleTagRow } = membership;
  return peopleTagRow;
}

export async function upsertPeopleTagMembership(
  ctx: DomainContext,
  personId: string,
  tagId: string,
): Promise<{ tag: Tag; personId: string; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const { data: membership, error } = await client
    .from("people_tags")
    .upsert(
      { person_id: personId, tag_id: tagId, user_id: user.id },
      { onConflict: "person_id,tag_id" },
    )
    .select(PEOPLE_TAG_WITH_TAG_SELECT)
    .single();

  if (error || !membership) {
    if (error) {
      throw internal("tag_upsert_failed", error);
    }
    throw new DomainError("Tag not found", 404, "tag_not_found");
  }

  const typedMembership = membership as PeopleTagMembershipRow;
  const tag = typedMembership.tags;
  if (!tag) {
    throw new DomainError("Tag not found", 404, "tag_not_found");
  }

  const { txid } = await withPersonTxid(client, user.id, async () => ({ personId }));
  const changes = [buildPeopleTagChangeFromRow(toPeopleTagSyncRow(typedMembership))];
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { personId, serverSequence, tag, txid };
}

export async function removePeopleTagMembership(
  ctx: DomainContext,
  personId: string,
  tagId: string,
): Promise<{ personId: string; tagId: string; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const { data: deletedMembership, error } = await client
    .from("people_tags")
    .delete()
    .eq("person_id", personId)
    .eq("tag_id", tagId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw internal("tag_failed", error.message);
  }

  const peopleTagId = deletedMembership?.id ?? null;

  const { txid } = await withPersonTxid(client, user.id, async () => ({ personId }));
  const changes = peopleTagId
    ? [
        {
          entityId: peopleTagId,
          operation: "delete" as const,
          table: "people_tags" as const,
          value: null,
        },
      ]
    : [];
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { personId, serverSequence, tagId, txid };
}

export async function upsertPeopleTagMemberships(
  ctx: DomainContext,
  tagId: string,
  personIds: string[],
): Promise<{ addedCount: number; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const { data: tag, error: tagError } = await client
    .from("tags")
    .select("id")
    .eq("id", tagId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (tagError) {
    throw internal("tag_failed", tagError.message);
  }
  if (!tag) {
    throw new DomainError("Tag not found", 404, "tag_not_found");
  }

  if (personIds.length === 0) {
    return { addedCount: 0, serverSequence: 0, txid: "" };
  }

  const memberships = personIds.map((personId) => ({
    person_id: personId,
    tag_id: tagId,
    user_id: user.id,
  }));

  const { error } = await client.from("people_tags").upsert(memberships, {
    ignoreDuplicates: true,
    onConflict: "person_id,tag_id",
  });

  if (error) {
    throw internal("tag_failed", error.message);
  }

  const changes = (
    await Promise.all(
      personIds.map((personId) => buildPeopleTagChange(client, user.id, personId, tagId)),
    )
  ).filter((change): change is NonNullable<typeof change> => change !== null);

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { addedCount: personIds.length, serverSequence, txid };
}

export async function removePeopleTagMemberships(
  ctx: DomainContext,
  tagId: string,
  personIds: string[],
): Promise<{ removedCount: number; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const peopleTagIds = await Promise.all(
    personIds.map((personId) => findPeopleTagId(client, user.id, personId, tagId)),
  );

  const { error } = await client
    .from("people_tags")
    .delete()
    .eq("tag_id", tagId)
    .eq("user_id", user.id)
    .in("person_id", personIds);

  if (error) {
    throw internal("tag_failed", error.message);
  }

  const changes = peopleTagIds
    .filter((id): id is string => id !== null)
    .map((entityId) => ({
      entityId,
      operation: "delete" as const,
      table: "people_tags" as const,
      value: null,
    }));

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { removedCount: personIds.length, serverSequence, txid };
}
