import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import type { SyncChange } from "@bondery/schemas/sync";
import { loadTestEnv } from "../../test/load-test-env.js";
import { fetchSyncChangeLogRows } from "../data/prisma-sync.js";
import { bumpPersonSyncTxid } from "../data/sync-txid.js";
import { emitSyncBatch } from "./emit-change.js";

loadTestEnv();

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** A promise plus the function that resolves it, so one step can wait for another. */
function deferred() {
  const state: { resolve?: () => void } = {};
  const promise = new Promise<void>((resolve) => {
    state.resolve = resolve;
  });
  return { promise, resolve: () => state.resolve?.() };
}

function changeFor(entityId: string): SyncChange[] {
  return [{ entityId, operation: "update", table: "people", value: { id: entityId } }];
}

describe("sync log atomicity (real Postgres)", () => {
  const userId = randomUUID();
  const personId = randomUUID();

  before(async () => {
    await prisma.user.create({ data: { email: `sync-atomic-${userId}@example.test`, id: userId } });
    await prisma.people.create({ data: { firstName: "Probe", id: personId, userId } });
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("blocks a second emit until the first transaction commits, and keeps sequences in order", async () => {
    const firstMayCommit = deferred();
    const firstReserved = deferred();

    const firstEntity = randomUUID();
    const secondEntity = randomUUID();

    const first = prisma.$transaction(
      async (tx) => {
        const sequence = await emitSyncBatch(
          userId,
          changeFor(firstEntity),
          undefined,
          tx as unknown as typeof prisma,
        );
        firstReserved.resolve();
        await firstMayCommit.promise;
        return sequence;
      },
      { timeout: 30_000 },
    );

    await firstReserved.promise;

    let secondDone = false;
    const second = emitSyncBatch(userId, changeFor(secondEntity)).then((sequence) => {
      secondDone = true;
      return sequence;
    });

    await sleep(400);
    assert.equal(secondDone, false, "second emit must wait for the first transaction");

    const visibleWhileOpen = await fetchSyncChangeLogRows(prisma, userId, 0, 100);
    assert.equal(
      visibleWhileOpen.some((row) => row.entity_id === secondEntity),
      false,
      "a pull must not see the later batch without the earlier one",
    );

    firstMayCommit.resolve();
    const [firstSequence, secondSequence] = await Promise.all([first, second]);

    assert.ok(firstSequence !== null && secondSequence !== null);
    assert.equal(secondSequence, firstSequence + 1);

    const rows = await fetchSyncChangeLogRows(prisma, userId, 0, 100);
    assert.deepEqual(
      rows.map((row) => row.entity_id),
      [firstEntity, secondEntity],
    );
  });

  it("bumpPersonSyncTxid on the transaction client does not wait on its own row lock", async () => {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '2s'`;
      await tx.people.update({ data: { firstName: "Probe 2" }, where: { id: personId } });
      const txid = await bumpPersonSyncTxid(tx as unknown as typeof prisma, personId, userId);
      const own = await tx.$queryRaw<{ txid: string }[]>`SELECT txid_current()::text AS txid`;
      return { own: own[0]?.txid, txid };
    });

    assert.equal(result.txid, result.own);
  });
});
