import type { Tag } from "@bondery/schemas";
import { internal } from "../../lib/platform/errors/http-errors.js";
import {
  buildPeopleTagChangeFromRow,
  buildPeopleTagChangeWithDb,
  findPeopleTagIdWithDb,
} from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { assertOwnedPersonIds } from "./assert-owned-person-ids.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "./context.js";
import { domainDb } from "./domain-db.js";
import { toPeopleTagSyncRow, toTagDto } from "./prisma-helpers.js";
import { captureCurrentSyncTxid, withPersonTxid } from "./with-txid.js";

export async function upsertPeopleTagMembership(
  ctx: DomainContext,
  personId: string,
  tagId: string,
): Promise<{ tag: Tag; personId: string; txid: string; serverSequence: number }> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const tagRow = await db.tag.findFirst({ where: { id: tagId, userId: user.id } });
  if (!tagRow) {
    throw new DomainError("Tag not found", 404, "tag_not_found");
  }

  await assertOwnedPersonIds(ctx, [personId]);

  await db.peopleTag.upsert({
    create: { personId, tagId, userId: user.id },
    update: {},
    where: { personId_tagId: { personId, tagId } },
  });

  const membership = await db.peopleTag.findFirst({
    where: { personId, tagId, userId: user.id },
  });
  if (!membership) {
    throw internal("internal_server_error", "people_tag membership missing after upsert");
  }

  const tag = toTagDto(tagRow);
  const { txid } = await withPersonTxid(user.id, async () => ({ personId }));
  const changes = [buildPeopleTagChangeFromRow(toPeopleTagSyncRow(membership))];
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { personId, serverSequence, tag, txid };
}

export async function removePeopleTagMembership(
  ctx: DomainContext,
  personId: string,
  tagId: string,
): Promise<{ personId: string; tagId: string; txid: string; serverSequence: number }> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const membership = await db.peopleTag.findFirst({
    select: { id: true },
    where: { personId, tagId, userId: user.id },
  });

  if (membership) {
    await db.peopleTag.deleteMany({
      where: { personId, tagId, userId: user.id },
    });
  }

  const peopleTagId = membership?.id ?? null;

  const { txid } = await withPersonTxid(user.id, async () => ({ personId }));
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
  const { user } = ctx;
  const db = domainDb(ctx);

  const tag = await db.tag.findFirst({ where: { id: tagId, userId: user.id } });
  if (!tag) {
    throw new DomainError("Tag not found", 404, "tag_not_found");
  }

  if (personIds.length === 0) {
    return { addedCount: 0, serverSequence: 0, txid: "" };
  }

  await assertOwnedPersonIds(ctx, personIds);

  await db.peopleTag.createMany({
    data: personIds.map((personId) => ({
      personId,
      tagId,
      userId: user.id,
    })),
    skipDuplicates: true,
  });

  const changes = (
    await Promise.all(
      personIds.map((personId) => buildPeopleTagChangeWithDb(db, user.id, personId, tagId)),
    )
  ).filter((change): change is NonNullable<typeof change> => change !== null);

  const txid = await captureCurrentSyncTxid();
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { addedCount: personIds.length, serverSequence, txid };
}

export async function removePeopleTagMemberships(
  ctx: DomainContext,
  tagId: string,
  personIds: string[],
): Promise<{ removedCount: number; txid: string; serverSequence: number }> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const peopleTagIds = await Promise.all(
    personIds.map((personId) => findPeopleTagIdWithDb(db, user.id, personId, tagId)),
  );

  await db.peopleTag.deleteMany({
    where: {
      personId: { in: personIds },
      tagId,
      userId: user.id,
    },
  });

  const changes = peopleTagIds
    .filter((id): id is string => id !== null)
    .map((entityId) => ({
      entityId,
      operation: "delete" as const,
      table: "people_tags" as const,
      value: null,
    }));

  const txid = await captureCurrentSyncTxid();
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { removedCount: personIds.length, serverSequence, txid };
}
