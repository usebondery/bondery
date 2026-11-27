/**
 * Card store and reconciler against real Postgres. Change-log input comes from the domain
 * functions, so the tests see the rows `withSyncedWrite` really writes.
 *
 * Needs a migrated Postgres. It runs in `test:api`.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it, mock } from "node:test";
import { prisma } from "@bondery/db";
import { CARDDAV_LIMITS } from "@bondery/schemas";
import { emptyCardExtras, serializeCardV3 } from "@bondery/vcard";
import sharp from "sharp";
import { createContact } from "../../domains/contacts/create-contact.js";
import { deleteContact } from "../../domains/contacts/delete-contact.js";
import { uploadContactPhoto } from "../../domains/contacts/photo.js";
import { updateContact } from "../../domains/contacts/update-contact.js";
import { getContactAvatarStoragePath } from "../contacts/avatar-storage.js";
import logger from "../platform/logger.js";
import { AVATARS_BUCKET, getStorage } from "../storage/get-storage.js";
import { withSyncedWrite } from "../sync/synced-write.js";
import { getAddressBookState, getCardsByHrefs, listLiveCards } from "./card-store.js";
import { CARDDAV_PROJECTION_VERSION, reconcileAddressBook } from "./reconcile.js";
import {
  addPeople,
  cardOf,
  newUser,
  reconcileToEnd,
  registerReconcileTestHooks,
} from "./reconcile-test-helpers.js";
import { renderCard, renderCards } from "./render-card.js";

const PHOTO_PARAMS = /PHOTO;ENCODING=b/;
const ANY_PHOTO = /PHOTO/;
registerReconcileTestHooks();

describe("first build", () => {
  it("builds one card per person except myself", async () => {
    const { ctx, id } = await newUser();
    const personIds = await addPeople(ctx, 3);

    const result = await reconcileAddressBook(id);

    assert.equal(result.done, true);
    assert.equal(result.revision, 3n);
    const state = await getAddressBookState(id);
    assert.ok(state);
    assert.equal(state.syncToken, `https://usebondery.com/ns/sync/${state.generation}-3`);
    assert.equal(state.ctag, state.syncToken);

    const live = await listLiveCards(state.addressBookId);
    assert.deepEqual(
      live.map((entry) => entry.href),
      personIds.map((personId) => `${personId}.vcf`).sort((a, b) => a.localeCompare(b)),
    );
    const card = await cardOf(id, personIds[0] as string);
    assert.equal(card.uid, `urn:uuid:${personIds[0]}`);
    assert.equal(card.kind, "person");
    assert.equal(card.photoVersion, null);
    assert.equal(await prisma.carddavCardVersion.count({ where: { card: { userId: id } } }), 3);

    const book = await prisma.carddavAddressBook.findUniqueOrThrow({ where: { userId: id } });
    assert.equal(book.projectionVersion, CARDDAV_PROJECTION_VERSION);
    assert.ok(book.reconciledThrough > 0n);
  });

  it("never makes a card for the myself person", async () => {
    const { id } = await newUser();

    await reconcileAddressBook(id);

    assert.equal(await prisma.carddavCard.count({ where: { userId: id } }), 0);
  });

  it("picks up a write that commits after the head it recorded", async () => {
    const { ctx, id } = await newUser();
    await addPeople(ctx, 2);
    await reconcileAddressBook(id);
    const [late] = await addPeople(ctx, 1);

    await reconcileAddressBook(id);

    assert.ok(await cardOf(id, late as string));
  });
});

describe("incremental changes", () => {
  it("bumps the revision and writes a version row for an edit to a mapped field", async () => {
    const { ctx, id } = await newUser();
    const [personId] = await addPeople(ctx, 1);
    await reconcileAddressBook(id);
    const before = await cardOf(id, personId as string);

    await updateContact(ctx, {
      patch: { headline: "Mathematician" },
      personId: personId as string,
    });
    const result = await reconcileAddressBook(id);

    const updated = await cardOf(id, personId as string);
    assert.equal(result.revision, 2n);
    assert.equal(updated.revision, 2n);
    assert.notEqual(updated.etag, before.etag);
    assert.equal(await prisma.carddavCardVersion.count({ where: { cardId: updated.id } }), 2);
  });

  it("leaves ETag and revision alone for notes and keep-in-touch edits", async () => {
    const { ctx, id } = await newUser();
    const [personId] = await addPeople(ctx, 1);
    await reconcileAddressBook(id);
    const before = await cardOf(id, personId as string);

    await updateContact(ctx, {
      patch: { keepFrequencyDays: 30, notes: "<p>Private</p>" },
      personId: personId as string,
    });
    const result = await reconcileAddressBook(id);

    const updated = await cardOf(id, personId as string);
    assert.equal(result.done, true);
    assert.equal(result.revision, 1n);
    assert.equal(updated.etag, before.etag);
    assert.equal(updated.revision, before.revision);
  });
});

describe("child deletes and chunked resume", () => {
  it("re-renders a person whose phone was removed (child delete with no row data)", async () => {
    const { ctx, id } = await newUser();
    const created = await createContact(ctx, {
      firstName: "Ada",
      phones: [{ preferred: true, prefix: "+420", type: "mobile", value: "777123456" }],
    });
    const { personId } = created.data;
    await reconcileAddressBook(id);
    const before = await cardOf(id, personId);
    assert.equal((before.projection as { phones: unknown[] }).phones.length, 1);

    await updateContact(ctx, { patch: { phones: [] }, personId });
    const deletes = await prisma.syncChangeLog.findMany({
      select: { rowData: true },
      where: { operation: "delete", tableName: "people_phones", userId: id },
    });
    assert.ok(deletes.length > 0, "the phone delete must reach the log");
    assert.ok(deletes.every((row) => row.rowData === null));
    await reconcileAddressBook(id);

    const updated = await cardOf(id, personId);
    assert.deepEqual((updated.projection as { phones: unknown[] }).phones, []);
    assert.notEqual(updated.etag, before.etag);
    assert.equal(updated.revision, 2n);
  });

  it("logs and skips a child delete it cannot resolve", async () => {
    const { ctx, id } = await newUser();
    await addPeople(ctx, 1);
    await reconcileAddressBook(id);
    const strayId = randomUUID();
    const sequence = await prisma.syncUserSequence.update({
      data: { lastSequence: { increment: 1 } },
      select: { lastSequence: true },
      where: { userId: id },
    });
    await prisma.syncChangeLog.create({
      data: {
        changeIndex: 0,
        entityId: strayId,
        operation: "delete",
        serverSequence: sequence.lastSequence,
        tableName: "people_phones",
        userId: id,
      },
    });
    const warn = mock.method(logger, "warn");

    const result = await reconcileAddressBook(id);

    assert.equal(result.done, true);
    const book = await prisma.carddavAddressBook.findUniqueOrThrow({ where: { userId: id } });
    assert.equal(book.reconciledThrough, sequence.lastSequence);
    assert.equal(warn.mock.callCount(), 1);
    const logged = warn.mock.calls.at(0);
    assert.deepEqual(logged?.arguments[0], { entityId: strayId, table: "people_phones" });
  });

  it("resumes across calls when maxPersons is small", async () => {
    const { ctx, id } = await newUser();
    await addPeople(ctx, 2);
    await reconcileAddressBook(id);
    const created = await addPeople(ctx, 5);

    const first = await reconcileAddressBook(id, { maxPersons: 2 });
    assert.equal(first.done, false);
    const calls = await reconcileToEnd(id, 2);

    assert.ok(calls >= 2);
    for (const personId of created) {
      assert.ok(await cardOf(id, personId));
    }
    assert.equal((await reconcileAddressBook(id)).done, true);
  });
});

describe("removal", () => {
  it("turns a deleted person into a tombstone that keeps person_id", async () => {
    const { ctx, id } = await newUser();
    const [personId] = await addPeople(ctx, 2);
    await reconcileAddressBook(id);
    const before = await cardOf(id, personId as string);

    await deleteContact(ctx, personId as string);
    const result = await reconcileAddressBook(id);

    const tombstone = await prisma.carddavCard.findUniqueOrThrow({ where: { id: before.id } });
    assert.ok(tombstone.deletedAt);
    assert.equal(tombstone.personId, personId);
    assert.equal(tombstone.revision, result.revision);
    const state = await getAddressBookState(id);
    assert.equal((await listLiveCards(state?.addressBookId as string)).length, 1);
  });

  it("tombstones a card when its person becomes myself", async () => {
    const { ctx, id } = await newUser();
    const [personId] = await addPeople(ctx, 1);
    await reconcileAddressBook(id);

    await withSyncedWrite({ user: ctx.user }, async (sw) => {
      await sw.db.people.update({ data: { myself: true }, where: { id: personId as string } });
      sw.touch("people", [personId as string]);
    });
    await reconcileAddressBook(id);

    const card = await cardOf(id, personId as string);
    assert.ok(card.deletedAt);
  });
});

describe("locking", () => {
  it("returns the committed state at once when the address book is locked", async () => {
    const { ctx, id } = await newUser();
    await addPeople(ctx, 1);
    await reconcileAddressBook(id);
    await addPeople(ctx, 1);

    let busy: Awaited<ReturnType<typeof reconcileAddressBook>> | undefined;
    const startedAt = Date.now();
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM carddav_address_books WHERE user_id = ${id}::uuid FOR UPDATE`;
      busy = await reconcileAddressBook(id);
    });

    assert.deepEqual(busy, { done: false, revision: 1n });
    assert.ok(Date.now() - startedAt < 5000, "a busy reconcile must not wait");
    assert.equal((await reconcileAddressBook(id)).done, true);
  });
});

describe("rendering", () => {
  it("renders the stored projection and includes the stored avatar", async () => {
    const { ctx, id } = await newUser();
    const created = await createContact(ctx, { firstName: "Grace", lastName: "Hopper" });
    const { personId } = created.data;
    const jpeg = await sharp({
      create: { background: "#aa3333", channels: 3, height: 8, width: 8 },
    })
      .jpeg()
      .toBuffer();
    await uploadContactPhoto(ctx, personId, jpeg, "image/jpeg");
    await reconcileAddressBook(id);
    const state = await getAddressBookState(id);

    const [card] = await getCardsByHrefs(state?.addressBookId as string, [`${personId}.vcf`]);
    assert.ok(card?.projection);
    assert.ok(card.photoVersion);
    const rendered = await renderCard(card, "3.0");

    const stored = await getStorage().get(
      AVATARS_BUCKET,
      getContactAvatarStoragePath(id, personId),
    );
    assert.ok(stored);
    assert.equal(
      rendered.body,
      serializeCardV3(card.projection, {
        extras: card.extras,
        photo: { jpegBytes: stored },
        uid: card.uid,
      }),
    );
    assert.match(rendered.body, PHOTO_PARAMS);
    assert.equal(rendered.etag, card.etag);
  });

  it("renders a card without a photo when none is set", async () => {
    const { ctx, id } = await newUser();
    const [personId] = await addPeople(ctx, 1);
    await reconcileAddressBook(id);
    const state = await getAddressBookState(id);

    const [card] = await getCardsByHrefs(state?.addressBookId as string, [`${personId}.vcf`]);
    assert.ok(card?.projection);
    const [rendered] = await renderCards([card], "3.0");

    assert.equal(
      rendered?.body,
      serializeCardV3(card.projection, { extras: emptyCardExtras(), uid: card.uid }),
    );
    assert.doesNotMatch(rendered?.body ?? "", ANY_PHOTO);
  });

  it("returns an opaque card exactly as stored", async () => {
    const { id } = await newUser();
    await reconcileAddressBook(id);
    const state = await getAddressBookState(id);
    const rawVcard = "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Friends\r\nEND:VCARD\r\n";
    await prisma.carddavCard.create({
      data: {
        addressBookId: state?.addressBookId as string,
        etag: '"opaque-1"',
        href: "friends.vcf",
        kind: "opaque",
        rawVcard,
        revision: 1n,
        uid: "group-1",
        userId: id,
      },
    });

    const [card] = await getCardsByHrefs(state?.addressBookId as string, ["friends.vcf"]);
    assert.ok(card);

    assert.deepEqual(await renderCard(card, "3.0"), { body: rawVcard, etag: '"opaque-1"' });
  });
});

describe("card lookup and tenant isolation", () => {
  it("rejects more hrefs than one multiget may name", async () => {
    const hrefs = Array.from(
      { length: CARDDAV_LIMITS.multigetMaxHrefs + 1 },
      (_, index) => `${index}.vcf`,
    );

    await assert.rejects(getCardsByHrefs(randomUUID(), hrefs), RangeError);
  });

  it("never reads or writes another user's address book", async () => {
    const alice = await newUser();
    const bob = await newUser();
    const [alicePerson] = await addPeople(alice.ctx, 2);
    await addPeople(bob.ctx, 1);

    await reconcileAddressBook(alice.id);

    assert.equal(await getAddressBookState(bob.id), null);
    assert.equal(await prisma.carddavCard.count({ where: { userId: bob.id } }), 0);

    await reconcileAddressBook(bob.id);
    const aliceState = await getAddressBookState(alice.id);
    const bobState = await getAddressBookState(bob.id);
    assert.equal(await prisma.carddavCard.count({ where: { userId: alice.id } }), 2);
    assert.equal(await prisma.carddavCard.count({ where: { userId: bob.id } }), 1);
    assert.deepEqual(
      await getCardsByHrefs(bobState?.addressBookId as string, [`${alicePerson}.vcf`]),
      [],
    );
    assert.equal((await listLiveCards(aliceState?.addressBookId as string)).length, 2);
  });
});
