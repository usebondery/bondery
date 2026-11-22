import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { BONDERY_EXPORT_AVATARS_PREFIX, exportPeopleFileSchema } from "@bondery/schemas";
import AdmZip from "adm-zip";
import { DomainError } from "../domains/_shared/context.js";
import { generateExportZip } from "../domains/me/export.js";
import { resetStorageForTests, setStorageForTests } from "../lib/storage/get-storage.js";
import { loadTestEnv } from "./load-test-env.js";
import { createMemoryStorage } from "./memory-storage.js";

loadTestEnv();

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PERSON_ID = "22222222-2222-4222-8222-222222222222";
const ORPHAN_ID = "33333333-3333-4333-8333-333333333333";
const NOW = new Date("2026-08-19T15:04:05.000Z");
const BONDERY_VERSION = "1.9.1";
const CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

function createExportDb(people: Record<string, unknown>[]) {
  return {
    group: { findMany: async () => [] },
    interaction: { findMany: async () => [] },
    people: { findMany: async () => people },
    peopleGroup: { findMany: async () => [] },
    peopleRelationship: { findMany: async () => [] },
    peopleTag: { findMany: async () => [] },
    tag: { findMany: async () => [] },
  };
}

function personWithAvatar(): Record<string, unknown> {
  return {
    addresses: [],
    createdAt: CREATED_AT,
    emails: [],
    firstName: "Ada",
    hasAvatar: true,
    headline: null,
    id: PERSON_ID,
    importantDates: [],
    keepFrequencyDays: null,
    language: null,
    lastInteraction: null,
    lastInteractionActivityId: null,
    lastName: "Lovelace",
    latitude: null,
    linkedin: null,
    location: null,
    longitude: null,
    middleName: null,
    myself: false,
    notes: null,
    notesUpdatedAt: null,
    phones: [],
    socials: [],
    timezone: null,
    updatedAt: CREATED_AT,
    userId: USER_ID,
  };
}

function createCtx(db: object) {
  return {
    db: db as never,
    log: undefined,
    user: { email: "u@example.com", id: USER_ID },
  };
}

describe("generateExportZip photos", () => {
  beforeEach(() => {
    setStorageForTests(createMemoryStorage());
  });

  afterEach(() => {
    resetStorageForTests();
  });

  it("adds a JPEG when the avatar object is present", async () => {
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const storage = createMemoryStorage();
    await storage.put("avatars", `${USER_ID}/${PERSON_ID}.jpg`, jpeg);
    setStorageForTests(storage);

    const result = await generateExportZip(createCtx(createExportDb([personWithAvatar()])), {
      bonderyVersion: BONDERY_VERSION,
      now: NOW,
    });

    const zip = new AdmZip(result.buffer);
    const photoEntry = zip.getEntry(`${BONDERY_EXPORT_AVATARS_PREFIX}${PERSON_ID}.jpg`);
    assert.ok(photoEntry);
    assert.deepEqual(photoEntry.getData(), jpeg);

    const peopleEntry = zip.getEntry("people.json");
    assert.ok(peopleEntry);
    const peopleFile = exportPeopleFileSchema.parse(
      JSON.parse(peopleEntry.getData().toString("utf8")),
    );
    assert.equal(peopleFile.records[0]?.hasAvatar, true);
  });

  it("omits the photo file when the avatar object is missing and keeps hasAvatar", async () => {
    const result = await generateExportZip(createCtx(createExportDb([personWithAvatar()])), {
      bonderyVersion: BONDERY_VERSION,
      now: NOW,
    });

    const zip = new AdmZip(result.buffer);
    const names = zip.getEntries().map((entry) => entry.entryName);
    assert.equal(
      names.some((name) => name.startsWith(BONDERY_EXPORT_AVATARS_PREFIX)),
      false,
    );

    const peopleEntry = zip.getEntry("people.json");
    assert.ok(peopleEntry);
    const peopleFile = exportPeopleFileSchema.parse(
      JSON.parse(peopleEntry.getData().toString("utf8")),
    );
    assert.equal(peopleFile.records[0]?.hasAvatar, true);
  });

  it("adds a JPEG listed under the user folder even when hasAvatar is false", async () => {
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const storage = createMemoryStorage();
    await storage.put("avatars", `${USER_ID}/${PERSON_ID}.jpg`, jpeg);
    setStorageForTests(storage);

    const person = personWithAvatar();
    person.hasAvatar = false;
    const result = await generateExportZip(createCtx(createExportDb([person])), {
      bonderyVersion: BONDERY_VERSION,
      now: NOW,
    });

    const zip = new AdmZip(result.buffer);
    const photoEntry = zip.getEntry(`${BONDERY_EXPORT_AVATARS_PREFIX}${PERSON_ID}.jpg`);
    assert.ok(photoEntry);
    assert.deepEqual(photoEntry.getData(), jpeg);
  });

  it("does not export an avatar for a contact that is not in this ZIP", async () => {
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const storage = createMemoryStorage();
    await storage.put("avatars", `${USER_ID}/${ORPHAN_ID}.jpg`, jpeg);
    setStorageForTests(storage);

    const result = await generateExportZip(createCtx(createExportDb([personWithAvatar()])), {
      bonderyVersion: BONDERY_VERSION,
      now: NOW,
    });

    const zip = new AdmZip(result.buffer);
    assert.equal(zip.getEntry(`${BONDERY_EXPORT_AVATARS_PREFIX}${ORPHAN_ID}.jpg`), null);
  });

  it("fails the export when listing the avatar folder throws", async () => {
    setStorageForTests(
      createMemoryStorage({
        listKeys: async () => {
          throw new Error("S3 unavailable");
        },
      }),
    );

    await assert.rejects(
      () =>
        generateExportZip(createCtx(createExportDb([personWithAvatar()])), {
          bonderyVersion: BONDERY_VERSION,
          now: NOW,
        }),
      (error: unknown) =>
        error instanceof DomainError && error.code === "export_failed_to_generate",
    );
  });

  it("fails the export when fetching a listed avatar throws", async () => {
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const storage = createMemoryStorage({
      get: async () => {
        throw new Error("S3 unavailable");
      },
    });
    await storage.put("avatars", `${USER_ID}/${PERSON_ID}.jpg`, jpeg);
    setStorageForTests(storage);

    await assert.rejects(
      () =>
        generateExportZip(createCtx(createExportDb([personWithAvatar()])), {
          bonderyVersion: BONDERY_VERSION,
          now: NOW,
        }),
      (error: unknown) =>
        error instanceof DomainError && error.code === "export_failed_to_generate",
    );
  });
});
