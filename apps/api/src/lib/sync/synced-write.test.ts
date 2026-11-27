import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { createContact } from "../../domains/contacts/create-contact.js";
import { updateContact } from "../../domains/contacts/update-contact.js";
import {
  assertSyncLogMatchesBootstrap,
  replaySyncLog,
} from "../../test/assert-sync-log-matches-bootstrap.js";
import { loadTestEnv } from "../../test/load-test-env.js";
import { emitSyncBatch, SYNC_BATCH_MAX_CHANGES } from "./emit-change.js";
import { deferSyncWake, registerPendingWakes } from "./pending-wakes.js";
import { withSyncedWrite, withSyncedWriteResult } from "./synced-write.js";

loadTestEnv();

const ABORT_PATTERN = /abort/;

describe("pending wakes", () => {
  it("queues a wake only for a transaction that registered", () => {
    const registered = {} as never;
    const foreign = {} as never;
    const queue = registerPendingWakes(registered);

    let fired = 0;
    assert.equal(
      deferSyncWake(registered, () => {
        fired += 1;
      }),
      true,
    );
    assert.equal(
      deferSyncWake(foreign, () => {
        fired += 1;
      }),
      false,
    );
    assert.equal(queue.length, 1);
    assert.equal(fired, 0, "nothing fires until the owner flushes after the commit");
  });
});

describe("withSyncedWrite (real Postgres)", () => {
  const userId = randomUUID();
  const ctx = { user: { email: `synced-write-${userId}@example.test`, id: userId } };

  before(async () => {
    await prisma.user.create({ data: { email: ctx.user.email, id: userId } });
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("writes the rows and the log in one transaction, and rolls both back on error", async () => {
    const rolledBackId = randomUUID();
    await assert.rejects(
      withSyncedWrite(ctx, async (sw) => {
        await sw.db.people.create({ data: { firstName: "Gone", id: rolledBackId, userId } });
        sw.touch("people", [rolledBackId]);
        throw new Error("abort");
      }),
      ABORT_PATTERN,
    );

    assert.equal(await prisma.people.count({ where: { id: rolledBackId } }), 0);
    assert.equal(await prisma.syncChangeLog.count({ where: { entityId: rolledBackId } }), 0);

    const keptId = randomUUID();
    const { serverSequence } = await withSyncedWriteResult(ctx, async (sw) => {
      await sw.db.people.create({ data: { firstName: "Kept", id: keptId, userId } });
      sw.touch("people", [keptId]);
    });
    assert.ok(serverSequence !== null && serverSequence > 0);
    const row = (await replaySyncLog(userId)).get("people")?.get(keptId);
    assert.equal(row?.["first_name"], "Kept");
  });

  it("emits a delete for a touched row that no longer exists, and for a removed id", async () => {
    const goneId = randomUUID();
    await withSyncedWrite(ctx, async (sw) => {
      await sw.db.people.create({ data: { firstName: "Temp", id: goneId, userId } });
      sw.touch("people", [goneId]);
    });
    assert.equal((await replaySyncLog(userId)).get("people")?.has(goneId), true);

    await withSyncedWrite(ctx, async (sw) => {
      await sw.db.people.deleteMany({ where: { id: goneId, userId } });
      sw.remove("people", [goneId]);
    });
    assert.equal((await replaySyncLog(userId)).get("people")?.has(goneId), false);
  });

  it("splits a large write into batches of at most one page row budget", async () => {
    const ids = Array.from({ length: SYNC_BATCH_MAX_CHANGES * 2 + 5 }, () => randomUUID());
    const { serverSequence } = await withSyncedWriteResult(ctx, async (sw) => {
      await sw.db.people.createMany({
        data: ids.map((id) => ({ firstName: "Bulk", id, userId })),
      });
      sw.touch("people", ids);
    });

    const rows = await prisma.syncChangeLog.findMany({
      where: { entityId: { in: ids }, userId },
    });
    assert.equal(rows.length, ids.length);
    const perSequence = new Map<string, number>();
    for (const row of rows) {
      const key = String(row.serverSequence);
      perSequence.set(key, (perSequence.get(key) ?? 0) + 1);
    }
    assert.equal(perSequence.size, 3);
    assert.ok(Math.max(...perSequence.values()) <= SYNC_BATCH_MAX_CHANGES);
    assert.equal(serverSequence, Math.max(...rows.map((row) => Number(row.serverSequence))));
  });

  it("lets updateContact run inside it without waiting on its own row lock", async () => {
    const created = await createContact(ctx, { firstName: "Nested" });

    const result = await withSyncedWrite(ctx, async (sw) => {
      await sw.db.$executeRaw`SET LOCAL lock_timeout = '2s'`;
      const updated = await updateContact(
        { ...ctx, db: sw.db },
        { patch: { headline: "Inside a transaction" }, personId: created.data.personId },
      );
      const own = await sw.db.$queryRaw<{ txid: string }[]>`SELECT txid_current()::text AS txid`;
      return { own: own[0]?.txid, txid: updated.txid };
    });

    assert.equal(result.txid, result.own, "the txid must come from the surrounding transaction");
    const row = (await replaySyncLog(userId)).get("people")?.get(created.data.personId);
    assert.equal(row?.["headline"], "Inside a transaction");
  });

  it("joins an emitSyncBatch call on its client, so a rollback removes that row too", async () => {
    const entityId = randomUUID();
    await assert.rejects(
      withSyncedWrite(ctx, async (sw) => {
        await emitSyncBatch(
          userId,
          [{ entityId, operation: "update", table: "people", value: { id: entityId } }],
          undefined,
          sw.db,
        );
        throw new Error("abort");
      }),
      ABORT_PATTERN,
    );

    assert.equal(await prisma.syncChangeLog.count({ where: { entityId, userId } }), 0);
  });

  it("leaves the log equal to the bootstrap for every write above", async () => {
    await assert.doesNotReject(assertSyncLogMatchesBootstrap(userId));
  });
});
