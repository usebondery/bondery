/**
 * Layer 3: the commit step writes what the parser produced.
 *
 * Layer 2 proves a parser reads a fixture. This layer proves the parsed contacts reach the
 * database: people, phones, emails, birthdays, socials, and the default import group.
 *
 * The database is the in-memory Prisma fake the me-import tests already use. It records every
 * write, so an assertion names a row that must exist rather than trusting a return count.
 */
import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { commitInstagramImport } from "../../domains/import/instagram.js";
import { commitLinkedInImport } from "../../domains/import/linkedin.js";
import { commitVCardImport } from "../../domains/import/vcard.js";
import { setGeocoderForTests } from "../../lib/integrations/mapy.js";
import { resetStorageForTests, setStorageForTests } from "../../lib/storage/get-storage.js";
import { parseInstagramExportUpload } from "../../routes/import/instagram/parser.js";
import { parseLinkedInCsvUpload } from "../../routes/import/linkedin/parser.js";
import { parseVCardUpload } from "../../routes/import/vcard/parser.js";
import { loadUpload } from "./fixtures.js";
import { createMemoryGeocoder, knownPlaces } from "./geocoder.js";
import { createImportCtx, createImportDb } from "./memory-db.js";
import { createMemoryStorage } from "./memory-storage.js";

const USER_ID = "0192f2a0-0000-7000-8000-00000000u001";

let corpusGeocoder: Awaited<ReturnType<typeof createMemoryGeocoder>>;

before(async () => {
  corpusGeocoder = createMemoryGeocoder(await knownPlaces());
});

beforeEach(() => {
  setGeocoderForTests(corpusGeocoder);
  setStorageForTests(createMemoryStorage());
});

afterEach(() => {
  resetStorageForTests();
});

after(() => {
  setGeocoderForTests(null);
});

/** The people rows a commit wrote, excluding a pre-seeded myself row. */
function importedPeople(db: ReturnType<typeof createImportDb>): Record<string, unknown>[] {
  return db.peopleRows.filter((row) => row.userId === USER_ID && row.myself !== true);
}

describe("vCard commit: Samsung export", () => {
  it("writes every valid contact with its phones, birthdays, and socials", async () => {
    const contacts = await parseVCardUpload([await loadUpload("samsung/contacts.vcf")]);
    const db = createImportDb();
    const result = await commitVCardImport(createImportCtx(USER_ID, db), contacts);

    assert.equal(result.importedCount, 477);
    assert.equal(result.skippedCount, 0);
    assert.equal(importedPeople(db).length, 477);
    assert.equal(db.phones.length, 478, "478 TEL lines become 478 phone rows");
    assert.equal(db.emails.length, 36, "36 EMAIL lines become 36 email rows");
    assert.equal(db.importantDates.length, 40, "40 BDAY lines become 40 birthday rows");
    assert.ok(db.socials.length > 0, "a non-empty social column must write socials");
  });

  it("writes only the addresses the geocoder confirmed", async () => {
    const contacts = await parseVCardUpload([await loadUpload("samsung/contacts.vcf")]);
    const db = createImportDb();
    await commitVCardImport(createImportCtx(USER_ID, db), contacts);

    assert.equal(db.addresses.length, 13, "all 13 addresses are valid with a working geocoder");
    assert.ok(
      db.addresses.every((row) => row.geocodeConfidence === "verified"),
      "a validated address is stored as verified",
    );
  });

  it("attaches the 68 embedded avatars", async () => {
    const contacts = await parseVCardUpload([await loadUpload("samsung/contacts.vcf")]);
    const db = createImportDb();
    const storage = createMemoryStorage();
    setStorageForTests(storage);
    await commitVCardImport(createImportCtx(USER_ID, db), contacts);

    const withAvatar = importedPeople(db).filter((row) => row.hasAvatar === true);
    assert.equal(withAvatar.length, 68, "each decodable PHOTO sets hasAvatar");
    assert.equal(storage.objects.size, 68, "each avatar is written to storage");
  });

  it("puts every imported person in the default import group", async () => {
    const contacts = await parseVCardUpload([await loadUpload("samsung/contacts.vcf")]);
    const db = createImportDb();
    await commitVCardImport(createImportCtx(USER_ID, db), contacts);

    assert.equal(db.groups.length, 1, "one default group is created");
    assert.equal(db.groups[0]?.label, "Mobile Contacts");
    assert.equal(db.groupMemberships.length, 477, "every imported person joins the group");
  });

  it("writes nothing for an empty selection", async () => {
    const db = createImportDb();
    const result = await commitVCardImport(createImportCtx(USER_ID, db), []);

    assert.equal(result.importedCount, 0);
    assert.equal(db.getWrites(), 0);
  });
});

describe("linkedIn commit", () => {
  it("writes a person, a LinkedIn social, and the work email for each row", async () => {
    const header = "First Name,Last Name,URL,Email Address,Company,Position,Connected On";
    const rows = [
      "Ada,Lovelace,https://www.linkedin.com/in/ada-lovelace,ada@example.com,Analytical,Engineer,01/15/2024",
      "Alan,Turing,https://www.linkedin.com/in/alan-turing,alan@example.com,Bletchley,Reader,02/20/2024",
    ];
    const contacts = parseLinkedInCsvUpload([
      { content: Buffer.from([header, ...rows].join("\n"), "utf8"), fileName: "Connections.csv" },
    ]);
    const db = createImportDb();
    const result = await commitLinkedInImport(createImportCtx(USER_ID, db), contacts);

    assert.equal(result.importedCount, 2);
    assert.equal(importedPeople(db).length, 2);
    assert.equal(db.socials.length, 2, "one LinkedIn social per contact");
    assert.ok(
      db.socials.every((row) => row.platform === "linkedin"),
      "the platform must be linkedin",
    );
    assert.equal(db.emails.length, 2, "one work email per contact");
    assert.equal(db.groups[0]?.label, "LinkedIn: Connections");
  });

  it("builds the stored headline from position and company", async () => {
    const header = "First Name,Last Name,URL,Email Address,Company,Position,Connected On";
    const row =
      "Ada,Lovelace,https://www.linkedin.com/in/ada-lovelace,ada@example.com,Analytical,Engineer,01/15/2024";
    const contacts = parseLinkedInCsvUpload([
      { content: Buffer.from([header, row].join("\n"), "utf8"), fileName: "Connections.csv" },
    ]);
    const db = createImportDb();
    await commitLinkedInImport(createImportCtx(USER_ID, db), contacts);

    assert.equal(importedPeople(db)[0]?.headline, "Engineer @Analytical");
  });

  it("updates an existing contact instead of inserting a duplicate", async () => {
    const header = "First Name,Last Name,URL,Email Address,Company,Position,Connected On";
    const row =
      "Ada,Lovelace,https://www.linkedin.com/in/ada-lovelace,ada@example.com,Analytical,Engineer,01/15/2024";
    const contacts = parseLinkedInCsvUpload([
      { content: Buffer.from([header, row].join("\n"), "utf8"), fileName: "Connections.csv" },
    ]);
    const db = createImportDb({
      people: [
        {
          firstName: "Old",
          id: "0192f2a0-0000-7000-8000-000000000042",
          lastName: "Name",
          myself: false,
          userId: USER_ID,
        },
      ],
    });
    db.socials.push({
      handle: "ada-lovelace",
      id: "social-1",
      personId: "0192f2a0-0000-7000-8000-000000000042",
      platform: "linkedin",
      userId: USER_ID,
    });

    const result = await commitLinkedInImport(createImportCtx(USER_ID, db), contacts);

    assert.equal(result.importedCount, 0, "a known handle must not insert a second person");
    assert.equal(result.updatedCount, 1);
    assert.equal(importedPeople(db).length, 1);
    assert.equal(importedPeople(db)[0]?.firstName, "Ada");
  });
});

describe("instagram commit", () => {
  it("writes a person and an Instagram social per distinct handle", async () => {
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "following",
    );
    const db = createImportDb();
    const result = await commitInstagramImport(createImportCtx(USER_ID, db), contacts);

    assert.equal(result.importedCount, 70, "70 distinct handles become 70 people");
    assert.equal(importedPeople(db).length, 70);
    assert.equal(db.socials.length, 70);
    assert.ok(
      db.socials.every((row) => row.platform === "instagram"),
      "the platform must be instagram",
    );
    assert.equal(db.groups[0]?.label, "Instagram: Following");
  });

  it("puts mutual follows in both the following and followers group", async () => {
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "mutual_following",
    );
    const db = createImportDb();
    await commitInstagramImport(createImportCtx(USER_ID, db), contacts);

    const labels = db.groups
      .map((group) => group.label)
      .toSorted((a, b) => String(a).localeCompare(String(b)));
    assert.deepEqual(labels, ["Instagram: Followers", "Instagram: Following"]);
    const perGroup = new Map<string, number>();
    for (const membership of db.groupMemberships) {
      const key = String(membership.groupId);
      perGroup.set(key, (perGroup.get(key) ?? 0) + 1);
    }
    assert.equal(new Set(perGroup.values()).size, 1, "every mutual follow joins both groups");
  });

  it("files close friends under the close-friends group, not under following", async () => {
    // The close_friends strategy also reads following.json to fill in the follow date. Returning
    // that record wholesale would label the person `following` and file them in the wrong group.
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "close_friends",
    );
    const db = createImportDb();
    await commitInstagramImport(createImportCtx(USER_ID, db), contacts);

    const labels = db.groups.map((group) => group.label);
    assert.deepEqual(labels, ["Instagram: Close Friends"]);
    assert.equal(db.groupMemberships.length, contacts.length);
  });

  it("updates an existing contact instead of inserting a second one", async () => {
    // Seed one person that already carries a handle from the fixture, then import the whole file.
    const contacts = parseInstagramExportUpload(
      [await loadUpload("instagram/instagram-export.zip")],
      "followers",
    );
    const existing = contacts.at(0);
    assert.ok(existing !== undefined);
    const personId = "0192f2a0-0000-7000-8000-000000000099";
    const db = createImportDb({
      people: [
        { firstName: "Old", id: personId, lastName: "Name", myself: false, userId: USER_ID },
      ],
    });
    db.socials.push({
      handle: existing.instagramUsername.trim().toLowerCase(),
      id: "social-existing",
      personId,
      platform: "instagram",
      userId: USER_ID,
    });

    const result = await commitInstagramImport(createImportCtx(USER_ID, db), contacts);

    assert.equal(result.updatedCount, 1, "the known handle updates its person");
    assert.equal(
      result.importedCount,
      contacts.length - 1,
      "every other handle inserts, and the known one does not",
    );
    assert.equal(
      importedPeople(db).filter((row) => row.id === personId).length,
      1,
      "the seeded person is updated, not duplicated",
    );
    assert.equal(importedPeople(db)[0]?.firstName, existing.firstName);
  });
});
