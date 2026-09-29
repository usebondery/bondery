import {
  buildPeopleGroupChangeWithDb,
  findPeopleGroupIdWithDb,
} from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { assertOwnedPersonIds } from "./assert-owned-person-ids.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "./context.js";
import { domainDb } from "./domain-db.js";
import { captureCurrentSyncTxid } from "./with-txid.js";

export async function upsertPeopleGroupMemberships(
  ctx: DomainContext,
  groupId: string,
  personIds: string[],
): Promise<{ addedCount: number; skippedCount: number; txid: string; serverSequence: number }> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const group = await db.group.findFirst({ where: { id: groupId, userId: user.id } });
  if (!group) {
    throw new DomainError("Group not found", 404, "group_not_found");
  }

  if (personIds.length === 0) {
    return { addedCount: 0, serverSequence: 0, skippedCount: 0, txid: "" };
  }

  await assertOwnedPersonIds(ctx, personIds);

  const existingRows = await db.peopleGroup.findMany({
    select: { personId: true },
    where: {
      groupId,
      personId: { in: personIds },
      userId: user.id,
    },
  });

  const existingIds = new Set(existingRows.map((row) => row.personId));
  const newPersonIds = personIds.filter((id) => !existingIds.has(id));
  const skippedCount = existingIds.size;

  if (newPersonIds.length > 0) {
    await db.peopleGroup.createMany({
      data: newPersonIds.map((personId) => ({
        groupId,
        personId,
        userId: user.id,
      })),
      skipDuplicates: true,
    });
  }

  const changes = (
    await Promise.all(
      newPersonIds.map((personId) => buildPeopleGroupChangeWithDb(db, user.id, personId, groupId)),
    )
  ).filter((change): change is NonNullable<typeof change> => change !== null);

  const txid = await captureCurrentSyncTxid();
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { addedCount: newPersonIds.length, serverSequence, skippedCount, txid };
}

export async function removePeopleGroupMemberships(
  ctx: DomainContext,
  groupId: string,
  personIds: string[],
): Promise<{ removedCount: number; txid: string; serverSequence: number }> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const peopleGroupIds = await Promise.all(
    personIds.map((personId) => findPeopleGroupIdWithDb(db, user.id, personId, groupId)),
  );

  await db.peopleGroup.deleteMany({
    where: {
      groupId,
      personId: { in: personIds },
      userId: user.id,
    },
  });

  const changes = peopleGroupIds
    .filter((id): id is string => id !== null)
    .map((entityId) => ({
      entityId,
      operation: "delete" as const,
      table: "people_groups" as const,
      value: null,
    }));

  const txid = await captureCurrentSyncTxid();
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { removedCount: personIds.length, serverSequence, txid };
}
