/**
 * Every API write path that changes a mobile-synced table must write `sync_change_log`.
 *
 * Each test runs one path against real Postgres, then replays the user's log and compares it
 * with the bootstrap (`assertSyncLogMatchesBootstrap`). A path that skips the log leaves a
 * row missing, stale or extra, and its test fails.
 *
 * Needs a migrated Postgres, like `emit-change-atomicity.test.ts`. It runs in `test:api`.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import sharp from "sharp";
import { createContact } from "../domains/contacts/create-contact.js";
import { deleteContact } from "../domains/contacts/delete-contact.js";
import { enrichContact } from "../domains/contacts/enrichment/enrich.js";
import { upsertContactFromExtension } from "../domains/contacts/extension-upsert.js";
import { deleteContactPhoto, uploadContactPhoto } from "../domains/contacts/photo.js";
import { updateContact } from "../domains/contacts/update-contact.js";
import { commitInstagramImport } from "../domains/import/instagram.js";
import { commitLinkedInImport } from "../domains/import/linkedin.js";
import { commitVCardImport } from "../domains/import/vcard.js";
import { provisionNewUser } from "../lib/auth/provision-new-user.js";
import { updateContactPhoto } from "../lib/import/linkedin-helpers.js";
import { setGeocoderForTests } from "../lib/integrations/mapy.js";
import { resetStorageForTests, setStorageForTests } from "../lib/storage/get-storage.js";
import { parseInstagramExportUpload } from "../routes/import/instagram/parser.js";
import { parseLinkedInCsvUpload } from "../routes/import/linkedin/parser.js";
import { parseVCardUpload } from "../routes/import/vcard/parser.js";
import {
  assertSyncLogMatchesBootstrap,
  replaySyncLog,
} from "./assert-sync-log-matches-bootstrap.js";
import { loadUpload } from "./importers/fixtures.js";
import { createMemoryGeocoder, knownPlaces } from "./importers/geocoder.js";
import { loadTestEnv } from "./load-test-env.js";
import { createMemoryStorage } from "./memory-storage.js";

loadTestEnv();

const userIds: string[] = [];
let photoServer: Server;
let photoUrl: string;

async function newUser(): Promise<{ email: string; id: string }> {
  const id = randomUUID();
  const email = `sync-path-${id}@example.test`;
  await prisma.user.create({ data: { email, id, name: "Sync Path" } });
  userIds.push(id);
  return { email, id };
}

/** A user whose "myself" row went through `provisionNewUser`, like a real sign-up. */
async function newProvisionedUser() {
  const user = await newUser();
  await provisionNewUser({ email: user.email, name: "Sync Path", userId: user.id });
  return { ctx: { user }, user };
}

before(async () => {
  const jpeg = await sharp({
    create: { background: "#3366cc", channels: 3, height: 8, width: 8 },
  })
    .jpeg()
    .toBuffer();
  photoServer = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "image/jpeg" });
    response.end(jpeg);
  });
  await new Promise<void>((resolve) => {
    photoServer.listen(0, "127.0.0.1", resolve);
  });
  photoUrl = `http://127.0.0.1:${(photoServer.address() as AddressInfo).port}/photo.jpg`;
});

beforeEach(() => {
  setStorageForTests(createMemoryStorage());
});

afterEach(() => {
  resetStorageForTests();
  setGeocoderForTests(null);
});

after(async () => {
  await new Promise<void>((resolve) => {
    photoServer.close(() => resolve());
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("provisionNewUser", () => {
  it("writes the myself person to the sync log", async () => {
    const { user } = await newProvisionedUser();

    const replayed = await replaySyncLog(user.id);
    assert.equal(replayed.get("people")?.has(user.id), true);
    await assertSyncLogMatchesBootstrap(user.id);
  });
});

describe("contact create, update and delete", () => {
  it("keeps the log equal to the bootstrap after each step", async () => {
    const { ctx, user } = await newProvisionedUser();

    const created = await createContact(ctx, {
      emails: [{ preferred: true, type: "work", value: "ada@example.com" }],
      firstName: "Ada",
      lastName: "Lovelace",
    });
    await assertSyncLogMatchesBootstrap(user.id);

    await updateContact(ctx, {
      patch: { firstName: "Augusta", headline: "Mathematician" },
      personId: created.data.personId,
    });
    await assertSyncLogMatchesBootstrap(user.id);

    await deleteContact(ctx, created.data.personId);
    await assertSyncLogMatchesBootstrap(user.id);
    assert.equal((await replaySyncLog(user.id)).get("people")?.has(created.data.personId), false);
  });
});

describe("contact photo", () => {
  it("uploads and deletes through the contact photo domain", async () => {
    const { ctx, user } = await newProvisionedUser();
    const created = await createContact(ctx, { firstName: "Grace" });
    const jpeg = await sharp({
      create: { background: "#aa3333", channels: 3, height: 8, width: 8 },
    })
      .jpeg()
      .toBuffer();

    await uploadContactPhoto(ctx, created.data.personId, jpeg, "image/jpeg");
    await assertSyncLogMatchesBootstrap(user.id);
    const afterUpload = (await replaySyncLog(user.id)).get("people")?.get(created.data.personId);
    assert.equal(afterUpload?.["has_avatar"], true);

    await deleteContactPhoto(ctx, created.data.personId);
    await assertSyncLogMatchesBootstrap(user.id);
    const afterDelete = (await replaySyncLog(user.id)).get("people")?.get(created.data.personId);
    assert.equal(afterDelete?.["has_avatar"], false);
  });

  it("emits the avatar flag for an extension photo update", async () => {
    const { ctx, user } = await newProvisionedUser();
    const created = await createContact(ctx, { firstName: "Hedy" });

    await updateContactPhoto(ctx, created.data.personId, photoUrl);

    const row = (await replaySyncLog(user.id)).get("people")?.get(created.data.personId);
    assert.equal(row?.["has_avatar"], true);
    assert.ok(row?.["avatar_updated_at"], "avatar_updated_at must reach the log");
    await assertSyncLogMatchesBootstrap(user.id);
  });
});

describe("enrichContact", () => {
  it("writes headline, location, timezone, the geo point and the photo flag", async () => {
    setGeocoderForTests({
      cachedGeocodeLocation: () =>
        Promise.resolve({
          geo: {
            city: "Prague",
            country: "Czechia",
            countryCode: "CZ",
            formattedLabel: "Prague, Czechia",
            lat: 50.0755,
            locationEwkt: "SRID=4326;POINT(14.4378 50.0755)",
            lon: 14.4378,
            name: "Prague",
            postalCode: null,
            state: null,
            stateCode: null,
          },
          timezone: "Europe/Prague",
        }),
      timezoneForCoordinates: () => Promise.resolve(null),
      validateStreet: () => Promise.resolve(null),
    });
    const { ctx, user } = await newProvisionedUser();
    const created = await createContact(ctx, { firstName: "Ada" });

    await enrichContact(ctx, created.data.personId, {
      headline: "Engineer",
      location: "Prague",
      profileImageUrl: photoUrl,
    });

    const row = (await replaySyncLog(user.id)).get("people")?.get(created.data.personId);
    assert.equal(row?.["headline"], "Engineer");
    assert.equal(row?.["location"], "Prague, Czechia");
    assert.equal(row?.["timezone"], "Europe/Prague");
    assert.equal(row?.["has_avatar"], true);
    await assertSyncLogMatchesBootstrap(user.id);
  });
});

describe("vCard import", () => {
  it("writes people, child rows, the default group and photos, in many batches", async () => {
    setGeocoderForTests(createMemoryGeocoder(await knownPlaces()));
    const contacts = await parseVCardUpload([await loadUpload("samsung/contacts.vcf")]);
    const { ctx, user } = await newProvisionedUser();

    const result = await commitVCardImport(ctx, contacts);

    assert.equal(result.importedCount, 477);
    const replayed = await replaySyncLog(user.id);
    assert.equal(replayed.get("people")?.size, 478, "477 contacts and the myself row");
    assert.equal(replayed.get("groups")?.size, 1);
    assert.equal(replayed.get("people_groups")?.size, 477);
    await assertSyncLogMatchesBootstrap(user.id);

    const withAvatar = [...(replayed.get("people")?.values() ?? [])].filter(
      (row) => row["has_avatar"] === true,
    );
    assert.equal(withAvatar.length, 68, "each stored photo reaches the log");
  });
});

describe("linkedIn import", () => {
  const header = "First Name,Last Name,URL,Email Address,Company,Position,Connected On";

  function csv(rows: string[]) {
    return parseLinkedInCsvUpload([
      { content: Buffer.from([header, ...rows].join("\n"), "utf8"), fileName: "Connections.csv" },
    ]);
  }

  it("writes new people and updates known ones", async () => {
    const { ctx, user } = await newProvisionedUser();
    const ada =
      "Ada,Lovelace,https://www.linkedin.com/in/ada-lovelace,ada@example.com,Analytical,Engineer,01/15/2024";
    const alan =
      "Alan,Turing,https://www.linkedin.com/in/alan-turing,alan@example.com,Bletchley,Reader,02/20/2024";

    const first = await commitLinkedInImport(ctx, csv([ada, alan]));
    assert.equal(first.importedCount, 2);
    await assertSyncLogMatchesBootstrap(user.id);

    const updatedAda = ada.replace("Engineer", "Principal Engineer");
    const second = await commitLinkedInImport(ctx, csv([updatedAda]));
    assert.equal(second.updatedCount, 1);
    await assertSyncLogMatchesBootstrap(user.id);

    const headlines = [...((await replaySyncLog(user.id)).get("people")?.values() ?? [])].map(
      (row) => row["headline"],
    );
    assert.ok(headlines.includes("Principal Engineer @Analytical"));
  });
});

describe("instagram import", () => {
  it("writes people, socials and the default groups", async () => {
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "mutual_following",
    );
    const { ctx, user } = await newProvisionedUser();

    const result = await commitInstagramImport(ctx, contacts);

    assert.ok(result.importedCount > 0);
    const replayed = await replaySyncLog(user.id);
    assert.equal(replayed.get("groups")?.size, 2, "following and followers groups");
    await assertSyncLogMatchesBootstrap(user.id);

    const again = await commitInstagramImport(ctx, contacts);
    assert.equal(again.updatedCount, contacts.length, "a repeat import updates every person");
    await assertSyncLogMatchesBootstrap(user.id);
  });
});

describe("extension upsert", () => {
  it("writes a new contact, its extension group and its photo", async () => {
    const { ctx, user } = await newProvisionedUser();

    const created = await upsertContactFromExtension(ctx, {
      firstName: "Katherine",
      instagram: "katherine.j",
      profileImageUrl: photoUrl,
    });
    assert.equal(created.existed, false);
    await assertSyncLogMatchesBootstrap(user.id);

    const again = await upsertContactFromExtension(ctx, {
      headline: "Mathematician",
      instagram: "katherine.j",
    });
    assert.equal(again.existed, true);
    await assertSyncLogMatchesBootstrap(user.id);
  });
});
