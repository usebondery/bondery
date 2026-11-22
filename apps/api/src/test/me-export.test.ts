import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  BONDERY_EXPORT_FILE_ENTRIES,
  BONDERY_EXPORT_FORMAT,
  buildBonderyExportFilename,
  exportGroupsFileSchema,
  exportManifestSchema,
  exportMyselfFileSchema,
  exportPeopleFileSchema,
  exportTagsFileSchema,
} from "@bondery/schemas";
import AdmZip from "adm-zip";
import { generateExportZip, getExportSummary } from "../domains/me/export.js";
import { resetStorageForTests, setStorageForTests } from "../lib/storage/get-storage.js";
import { loadTestEnv } from "./load-test-env.js";
import { createMemoryStorage } from "./memory-storage.js";

loadTestEnv();

const USER_ID = "user-1";
const PERSON_ID = "person-1";
const GROUP_ID = "group-1";
const TAG_ID = "tag-1";
const INTERACTION_ID = "interaction-1";
const RELATIONSHIP_ID = "relationship-1";
const NOW = new Date("2026-08-19T15:04:05.000Z");
const BONDERY_VERSION = "1.9.1";

type QueryArgs = { where?: { NOT?: { myself?: boolean }; userId?: string } };

function iso(date: Date): string {
  return date.toISOString();
}

function createTrackingDb(fixture: {
  groupMemberships?: Record<string, unknown>[];
  groups?: Record<string, unknown>[];
  interactions?: Record<string, unknown>[];
  people?: Record<string, unknown>[];
  relationships?: Record<string, unknown>[];
  tagMemberships?: Record<string, unknown>[];
  tags?: Record<string, unknown>[];
}) {
  const calls: Array<{ method: string; userId?: string }> = [];

  function track<T>(method: string, args: QueryArgs | undefined, result: T): T {
    calls.push({ method, userId: args?.where?.userId });
    return result;
  }

  const people = fixture.people ?? [];
  const groups = fixture.groups ?? [];
  const tags = fixture.tags ?? [];
  const interactions = fixture.interactions ?? [];
  const relationships = fixture.relationships ?? [];
  const groupMemberships = fixture.groupMemberships ?? [];
  const tagMemberships = fixture.tagMemberships ?? [];

  return {
    calls,
    group: {
      count: async (args?: QueryArgs) => track("group.count", args, groups.length),
      findMany: async (args?: QueryArgs) => track("group.findMany", args, groups),
    },
    interaction: {
      count: async (args?: QueryArgs) => track("interaction.count", args, interactions.length),
      findMany: async (args?: QueryArgs) => track("interaction.findMany", args, interactions),
    },
    people: {
      count: async (args?: QueryArgs) => {
        const rows =
          args?.where?.NOT?.myself === true ? people.filter((row) => row.myself !== true) : people;
        return track("people.count", args, rows.length);
      },
      findMany: async (args?: QueryArgs) => track("people.findMany", args, people),
    },
    peopleGroup: {
      count: async (args?: QueryArgs) => track("peopleGroup.count", args, groupMemberships.length),
      findMany: async (args?: QueryArgs) => track("peopleGroup.findMany", args, groupMemberships),
    },
    peopleRelationship: {
      count: async (args?: QueryArgs) =>
        track("peopleRelationship.count", args, relationships.length),
      findMany: async (args?: QueryArgs) =>
        track("peopleRelationship.findMany", args, relationships),
    },
    peopleTag: {
      count: async (args?: QueryArgs) => track("peopleTag.count", args, tagMemberships.length),
      findMany: async (args?: QueryArgs) => track("peopleTag.findMany", args, tagMemberships),
    },
    tag: {
      count: async (args?: QueryArgs) => track("tag.count", args, tags.length),
      findMany: async (args?: QueryArgs) => track("tag.findMany", args, tags),
    },
  };
}

function createCtx(db: ReturnType<typeof createTrackingDb>) {
  return {
    db: db as never,
    log: undefined,
    user: { email: "u@example.com", id: USER_ID },
  };
}

function readZipJson(zip: AdmZip, name: string): unknown {
  const entry = zip.getEntry(name);
  assert.ok(entry, `expected ${name} in ZIP`);
  return JSON.parse(entry.getData().toString("utf8"));
}

function populatedFixture() {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  return {
    groupMemberships: [
      {
        createdAt,
        groupId: GROUP_ID,
        id: "gm-1",
        personId: PERSON_ID,
        userId: USER_ID,
      },
    ],
    groups: [
      {
        color: "#aabbcc",
        createdAt,
        emoji: "👋",
        id: GROUP_ID,
        label: "Friends",
        updatedAt: createdAt,
        userId: USER_ID,
      },
    ],
    interactions: [
      {
        createdAt,
        date: createdAt,
        description: "Coffee",
        id: INTERACTION_ID,
        participants: [{ personId: PERSON_ID }],
        title: "Catch-up",
        type: "Coffee",
        updatedAt: createdAt,
        userId: USER_ID,
      },
    ],
    people: [
      {
        addresses: [
          {
            addressCity: "Prague",
            addressCountry: "Czechia",
            addressCountryCode: "CZ",
            addressFormatted: "Main 1, Prague",
            addressGeocodeSource: "mapy.com",
            addressGranularity: "address",
            addressLine1: "Main 1",
            addressLine2: null,
            addressPostalCode: "11000",
            addressState: null,
            addressStateCode: null,
            createdAt,
            geocodeConfidence: "high",
            gisPoint: "secret-gis",
            id: "addr-1",
            label: "Home",
            latitude: 50.1,
            longitude: 14.4,
            personId: PERSON_ID,
            sortOrder: 0,
            timezone: "Europe/Prague",
            type: "home",
            updatedAt: createdAt,
            userId: USER_ID,
            value: "Main 1, Prague",
          },
        ],
        createdAt,
        emails: [
          {
            createdAt,
            id: "email-1",
            personId: PERSON_ID,
            preferred: true,
            sortOrder: 0,
            type: "personal",
            updatedAt: createdAt,
            userId: USER_ID,
            value: "ada@example.com",
          },
        ],
        firstName: "Ada",
        gisPoint: "secret-gis",
        hasAvatar: true,
        headline: "Engineer",
        id: PERSON_ID,
        importantDates: [
          {
            createdAt,
            date: createdAt,
            id: "date-1",
            note: null,
            notifyDaysBefore: 3,
            notifyOn: createdAt,
            personId: PERSON_ID,
            type: "birthday",
            updatedAt: createdAt,
            userId: USER_ID,
          },
        ],
        keepFrequencyDays: 30,
        language: "en",
        lastInteraction: createdAt,
        lastInteractionActivityId: INTERACTION_ID,
        lastName: "Lovelace",
        latitude: 50.1,
        linkedin: {
          bio: "Builder",
          educationHistory: [
            {
              createdAt,
              degree: "BA",
              description: null,
              endDate: null,
              id: "edu-1",
              schoolLinkedinId: null,
              schoolName: "University",
              startDate: createdAt,
              updatedAt: createdAt,
              userId: USER_ID,
            },
          ],
          workHistory: [
            {
              companyLinkedinId: null,
              companyName: "Acme",
              createdAt,
              description: null,
              employmentType: "full-time",
              endDate: null,
              id: "work-1",
              location: "Prague",
              startDate: createdAt,
              title: "Engineer",
              updatedAt: createdAt,
              userId: USER_ID,
            },
          ],
        },
        location: "Prague",
        longitude: 14.4,
        middleName: null,
        myself: false,
        notes: "Met at a meetup",
        notesUpdatedAt: createdAt,
        phones: [
          {
            createdAt,
            id: "phone-1",
            personId: PERSON_ID,
            preferred: true,
            prefix: "+420",
            sortOrder: 0,
            type: "mobile",
            updatedAt: createdAt,
            userId: USER_ID,
            value: "123456789",
          },
        ],
        socials: [
          {
            connectedAt: createdAt,
            createdAt,
            handle: "ada",
            id: "social-1",
            personId: PERSON_ID,
            platform: "linkedin",
            updatedAt: createdAt,
            userId: USER_ID,
          },
        ],
        timezone: "Europe/Prague",
        updatedAt: createdAt,
        userId: USER_ID,
      },
    ],
    relationships: [
      {
        createdAt,
        id: RELATIONSHIP_ID,
        relationshipType: "friend",
        sourcePersonId: PERSON_ID,
        targetPersonId: PERSON_ID,
        updatedAt: createdAt,
        userId: USER_ID,
      },
    ],
    tagMemberships: [
      {
        createdAt,
        id: "tm-1",
        personId: PERSON_ID,
        tagId: TAG_ID,
        userId: USER_ID,
      },
    ],
    tags: [
      {
        color: "#112233",
        createdAt,
        id: TAG_ID,
        label: "VIP",
        updatedAt: createdAt,
        userId: USER_ID,
      },
    ],
  };
}

describe("buildBonderyExportFilename", () => {
  it("uses the UTC calendar date", () => {
    assert.equal(buildBonderyExportFilename(NOW), "bondery-export-2026-08-19.zip");
  });
});

describe("getExportSummary", () => {
  it("returns counts that match fixture data", async () => {
    const db = createTrackingDb(populatedFixture());
    const result = await getExportSummary(createCtx(db));

    assert.equal(result.exportSummary.people, 1);
    assert.equal(result.exportSummary.groups, 1);
    assert.equal(result.exportSummary.tags, 1);
    assert.equal(result.exportSummary.interactions, 1);
    assert.equal(result.exportSummary.relationships, 1);
    assert.equal(typeof result.exportSummary.bonderyVersion, "string");
    assert.ok(result.exportSummary.bonderyVersion.length > 0);

    for (const call of db.calls) {
      assert.equal(call.userId, USER_ID, `${call.method} must scope by userId`);
    }
  });
});

describe("generateExportZip", () => {
  beforeEach(() => {
    setStorageForTests(createMemoryStorage());
  });

  afterEach(() => {
    resetStorageForTests();
  });

  it("builds a valid ZIP with nested people and no secrets", async () => {
    const db = createTrackingDb(populatedFixture());
    const result = await generateExportZip(createCtx(db), {
      bonderyVersion: BONDERY_VERSION,
      now: NOW,
    });

    assert.equal(result.filename, "bondery-export-2026-08-19.zip");
    assert.equal(result.isEmpty, false);

    const zip = new AdmZip(result.buffer);
    const names = zip.getEntries().map((entry) => entry.entryName);
    assert.deepEqual(names.toSorted(), [
      "groups.json",
      "interactions.json",
      "manifest.json",
      "myself.json",
      "people.json",
      "relationships.json",
      "tags.json",
    ]);

    for (const file of BONDERY_EXPORT_FILE_ENTRIES) {
      assert.ok(names.includes(file.name), `missing ${file.name}`);
    }

    const manifest = exportManifestSchema.parse(readZipJson(zip, "manifest.json"));
    assert.equal(manifest.format, BONDERY_EXPORT_FORMAT);
    assert.equal(manifest.schemaType, "Manifest");
    assert.equal(manifest.bonderyVersion, BONDERY_VERSION);
    assert.equal(manifest.exportedAt, iso(NOW));
    assert.equal(manifest.counts.people, 1);

    const peopleFile = exportPeopleFileSchema.parse(readZipJson(zip, "people.json"));
    assert.equal(peopleFile.bonderyVersion, BONDERY_VERSION);
    assert.equal(peopleFile.schemaType, "People");
    assert.equal(peopleFile.records.length, 1);

    const [person] = peopleFile.records;
    assert.equal(person?.id, PERSON_ID);
    assert.equal(person?.hasAvatar, true);
    assert.equal(person?.phones[0]?.value, "123456789");
    assert.equal(person?.emails[0]?.value, "ada@example.com");
    assert.equal(person?.addresses[0]?.latitude, 50.1);
    assert.equal(person?.linkedin?.bio, "Builder");
    assert.equal(person?.linkedin?.workHistory[0]?.companyName, "Acme");
    assert.equal("userId" in person, false);
    assert.equal("gisPoint" in person, false);
    assert.equal("userId" in (person?.phones[0] ?? {}), false);
    assert.equal("gisPoint" in (person?.addresses[0] ?? {}), false);
    assert.equal("userId" in (person?.linkedin?.workHistory[0] ?? {}), false);

    const groupsFile = exportGroupsFileSchema.parse(readZipJson(zip, "groups.json"));
    const tagsFile = exportTagsFileSchema.parse(readZipJson(zip, "tags.json"));
    const interactions = readZipJson(zip, "interactions.json") as {
      records: Array<{ participantIds: string[] }>;
    };

    assert.equal(groupsFile.schemaType, "Groups");
    assert.equal(groupsFile.records[0]?.members[0]?.personId, PERSON_ID);
    assert.equal(tagsFile.records[0]?.members[0]?.personId, PERSON_ID);
    assert.deepEqual(interactions.records[0]?.participantIds, [PERSON_ID]);

    for (const call of db.calls) {
      assert.equal(call.userId, USER_ID, `${call.method} must scope by userId`);
    }
  });

  it("returns a valid empty ZIP for an empty account", async () => {
    const db = createTrackingDb({});
    const result = await generateExportZip(createCtx(db), {
      bonderyVersion: BONDERY_VERSION,
      now: NOW,
    });

    assert.equal(result.filename, "bondery-export-2026-08-19.zip");
    assert.equal(result.isEmpty, true);

    const zip = new AdmZip(result.buffer);
    const manifest = exportManifestSchema.parse(readZipJson(zip, "manifest.json"));
    assert.equal(manifest.format, BONDERY_EXPORT_FORMAT);
    assert.equal(manifest.counts.people, 0);

    for (const file of BONDERY_EXPORT_FILE_ENTRIES) {
      const parsed = readZipJson(zip, file.name) as {
        bonderyVersion: string;
        records: unknown[];
        schemaType: string;
      };
      assert.equal(parsed.schemaType, file.schemaType);
      assert.equal(parsed.bonderyVersion, BONDERY_VERSION);
      assert.deepEqual(parsed.records, []);
    }

    for (const call of db.calls) {
      assert.equal(call.userId, USER_ID, `${call.method} must scope by userId`);
    }
  });

  it("writes the myself person to myself.json not people.json", async () => {
    const fixture = populatedFixture();
    const [ada] = fixture.people;
    assert.ok(ada);
    fixture.people = [
      ada,
      {
        ...ada,
        emails: [],
        firstName: "Owner",
        hasAvatar: false,
        id: USER_ID,
        lastName: null,
        myself: true,
        phones: [],
      },
    ];

    const summary = await getExportSummary(createCtx(createTrackingDb(fixture)));
    assert.equal(summary.exportSummary.people, 1);

    const zipResult = await generateExportZip(createCtx(createTrackingDb(fixture)), {
      bonderyVersion: BONDERY_VERSION,
      now: NOW,
    });
    assert.equal(zipResult.counts.people, 1);

    const zip = new AdmZip(zipResult.buffer);
    const peopleFile = exportPeopleFileSchema.parse(readZipJson(zip, "people.json"));
    const myselfFile = exportMyselfFileSchema.parse(readZipJson(zip, "myself.json"));
    assert.equal(peopleFile.records.length, 1);
    assert.equal(peopleFile.records[0]?.id, PERSON_ID);
    assert.equal(myselfFile.records.length, 1);
    assert.equal(myselfFile.records[0]?.id, USER_ID);
    assert.equal(myselfFile.records[0]?.firstName, "Owner");
  });
});
