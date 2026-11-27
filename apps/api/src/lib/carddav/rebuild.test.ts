/**
 * The resumable rebuild and the projection-version upgrade, against real Postgres.
 * Needs a migrated Postgres. It runs in `test:api`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { updateContact } from "../../domains/contacts/update-contact.js";
import { CARDDAV_PROJECTION_VERSION, reconcileAddressBook } from "./reconcile.js";
import {
  addPeople,
  cardOf,
  newUser,
  readBook,
  reconcileToEnd,
  registerReconcileTestHooks,
} from "./reconcile-test-helpers.js";

registerReconcileTestHooks();

describe("resumable rebuild", () => {
  it("bounds a first build by maxPersons and finishes across calls", async () => {
    const { ctx, id } = await newUser();
    await addPeople(ctx, 5);

    const first = await reconcileAddressBook(id, { maxPersons: 2 });

    assert.equal(first.done, false);
    const midway = await readBook(id);
    assert.equal(midway.projectionVersion, 0);
    assert.ok(midway.rebuildHead !== null);
    assert.ok(midway.rebuildAfterPersonId !== null);
    assert.equal(await prisma.carddavCard.count({ where: { userId: id } }), 2);

    const calls = await reconcileToEnd(id, 2);

    assert.ok(calls >= 2);
    assert.equal(await prisma.carddavCard.count({ where: { userId: id } }), 5);
    const done = await readBook(id);
    assert.equal(done.projectionVersion, CARDDAV_PROJECTION_VERSION);
    assert.equal(done.rebuildHead, null);
    assert.equal(done.rebuildAfterPersonId, null);
    assert.equal(done.revision, 5n);
  });

  it("picks up a write that commits mid-rebuild in the final incremental pass", async () => {
    const { ctx, id } = await newUser();
    const [first] = await addPeople(ctx, 4);
    await reconcileAddressBook(id, { maxPersons: 2 });
    const headAtStart = (await readBook(id)).rebuildHead;

    const [late] = await addPeople(ctx, 1);
    await updateContact(ctx, { patch: { headline: "Edited" }, personId: first as string });
    await reconcileToEnd(id, 2);

    assert.ok(late);
    assert.ok(await cardOf(id, late));
    const edited = await cardOf(id, first as string);
    assert.equal((edited.projection as { headline: { title: string } }).headline.title, "Edited");
    const book = await readBook(id);
    assert.ok(book.reconciledThrough > (headAtStart ?? 0n));
  });

  it("never lets two callers build at once", async () => {
    const { ctx, id } = await newUser();
    await addPeople(ctx, 6);

    const [a, b] = await Promise.all([
      reconcileAddressBook(id, { maxPersons: 2 }),
      reconcileAddressBook(id, { maxPersons: 2 }),
    ]);
    assert.ok(a.done === false || b.done === false);
    await reconcileToEnd(id, 2);

    assert.equal(await prisma.carddavCard.count({ where: { userId: id } }), 6);
    assert.equal(await prisma.carddavCardVersion.count({ where: { card: { userId: id } } }), 6);
    assert.equal((await readBook(id)).revision, 6n);
  });
});

describe("projection version", () => {
  it("rebuilds every card and tombstones cards of persons that are gone", async () => {
    const { ctx, id } = await newUser();
    const [kept, gone] = await addPeople(ctx, 2);
    await reconcileAddressBook(id);
    const keptCard = await cardOf(id, kept as string);
    await prisma.carddavCard.update({
      data: { etag: '"stale-3"', projection: {} },
      where: { id: keptCard.id },
    });
    await prisma.people.delete({ where: { id: gone as string } });
    await prisma.carddavAddressBook.update({
      data: { projectionVersion: CARDDAV_PROJECTION_VERSION - 1 },
      where: { userId: id },
    });

    const result = await reconcileAddressBook(id);

    assert.equal(result.done, true);
    const rebuilt = await cardOf(id, kept as string);
    assert.equal(rebuilt.etag, keptCard.etag);
    assert.ok(rebuilt.revision > keptCard.revision);
    assert.ok((await cardOf(id, gone as string)).deletedAt);
    const book = await prisma.carddavAddressBook.findUniqueOrThrow({ where: { userId: id } });
    assert.equal(book.projectionVersion, CARDDAV_PROJECTION_VERSION);
  });
});
