import { generateExportZip } from "../domains/me/export.js";
import { aliceFixture } from "./me-import-alice-fixture.js";
import { ALICE_ID, BOB_ID, BONDERY_VERSION, NOW } from "./me-import-constants.js";

type QueryArgs = { where?: { myself?: boolean; userId?: string } };

function createWriter<T extends Record<string, unknown>>(
  store: T[],
  getKeys: (row: T) => string[],
  onWrite: () => void,
) {
  function wouldSkip(row: T): boolean {
    const keys = new Set(getKeys(row));
    return store.some((existing) => getKeys(existing).some((key) => keys.has(key)));
  }

  return {
    createMany: async ({ data, skipDuplicates }: { data: T[]; skipDuplicates?: boolean }) => {
      let count = 0;
      for (const row of data) {
        if (skipDuplicates && wouldSkip(row)) {
          continue;
        }
        store.push(row);
        onWrite();
        count += 1;
      }
      return { count };
    },
    createManyAndReturn: async ({
      data,
      skipDuplicates,
    }: {
      data: T[];
      skipDuplicates?: boolean;
    }) => {
      const inserted: T[] = [];
      for (const row of data) {
        if (skipDuplicates && wouldSkip(row)) {
          continue;
        }
        store.push(row);
        onWrite();
        inserted.push(row);
      }
      return inserted;
    },
  };
}

export {
  ALICE_ID,
  BOB_ID,
  BONDERY_VERSION,
  CREATED_AT,
  GROUP_ID,
  INTERACTION_ID,
  NOW,
  PERSON_ID,
  RELATIONSHIP_ID,
  TAG_ID,
} from "./me-import-constants.js";

export function createExportDb(fixture: {
  groupMemberships?: Record<string, unknown>[];
  groups?: Record<string, unknown>[];
  interactions?: Record<string, unknown>[];
  people?: Record<string, unknown>[];
  relationships?: Record<string, unknown>[];
  tagMemberships?: Record<string, unknown>[];
  tags?: Record<string, unknown>[];
}) {
  const people = fixture.people ?? [];
  const groups = fixture.groups ?? [];
  const tags = fixture.tags ?? [];
  const interactions = fixture.interactions ?? [];
  const relationships = fixture.relationships ?? [];
  const groupMemberships = fixture.groupMemberships ?? [];
  const tagMemberships = fixture.tagMemberships ?? [];

  return {
    group: {
      count: async () => groups.length,
      findMany: async () => groups,
    },
    interaction: {
      count: async () => interactions.length,
      findMany: async () => interactions,
    },
    people: {
      count: async () => people.length,
      findMany: async () => people,
    },
    peopleGroup: {
      count: async () => groupMemberships.length,
      findMany: async () => groupMemberships,
    },
    peopleRelationship: {
      count: async () => relationships.length,
      findMany: async () => relationships,
    },
    peopleTag: {
      count: async () => tagMemberships.length,
      findMany: async () => tagMemberships,
    },
    tag: {
      count: async () => tags.length,
      findMany: async () => tags,
    },
  };
}

export function createImportDb(seed: { people?: Record<string, unknown>[] } = {}) {
  const people = [...(seed.people ?? [])];
  const groups: Record<string, unknown>[] = [];
  const tags: Record<string, unknown>[] = [];
  const phones: Record<string, unknown>[] = [];
  const emails: Record<string, unknown>[] = [];
  const socials: Record<string, unknown>[] = [];
  const addresses: Record<string, unknown>[] = [];
  const importantDates: Record<string, unknown>[] = [];
  const linkedin: Record<string, unknown>[] = [];
  const workHistory: Record<string, unknown>[] = [];
  const educationHistory: Record<string, unknown>[] = [];
  const interactions: Record<string, unknown>[] = [];
  const participants: Record<string, unknown>[] = [];
  const relationships: Record<string, unknown>[] = [];
  const groupMemberships: Record<string, unknown>[] = [];
  const tagMemberships: Record<string, unknown>[] = [];
  const syncChangeLog: Record<string, unknown>[] = [];
  let writes = 0;
  let gisCalls = 0;
  let importCompletedAt: Date | null = null;
  const onWrite = () => {
    writes += 1;
  };

  const byId = (row: Record<string, unknown>) => [String(row["id"])];

  return {
    $executeRaw: async () => {
      gisCalls += 1;
      return 1;
    },
    $queryRaw: async () => [{ allocate_sync_server_sequence: 1n }],
    addresses,
    emails,
    getGisCalls: () => gisCalls,
    getWrites: () => writes,
    group: createWriter(groups, byId, onWrite),
    groupMemberships,
    groups,
    interaction: createWriter(interactions, byId, onWrite),
    interactionParticipant: createWriter(
      participants,
      (row) => [`${String(row["interactionId"])}:${String(row["personId"])}`],
      onWrite,
    ),
    interactions,
    participants,
    people: {
      ...createWriter(people, byId, onWrite),
      count: async (args?: QueryArgs) => {
        let rows = people;
        if (args?.where?.userId) {
          rows = rows.filter((row) => row["userId"] === args.where?.userId);
        }
        if (args?.where?.myself === false) {
          rows = rows.filter((row) => row["myself"] !== true);
        }
        return rows.length;
      },
      updateMany: async ({
        data,
        where,
      }: {
        data: Record<string, unknown>;
        where: { id?: string; userId?: string };
      }) => {
        let count = 0;
        for (const row of people) {
          if (where["id"] && row["id"] !== where["id"]) {
            continue;
          }
          if (where["userId"] && row["userId"] !== where["userId"]) {
            continue;
          }
          Object.assign(row, data);
          count += 1;
        }
        return { count };
      },
    },
    peopleAddress: createWriter(addresses, byId, onWrite),
    peopleEducationHistory: createWriter(educationHistory, byId, onWrite),
    peopleEmail: createWriter(emails, byId, onWrite),
    peopleGroup: createWriter(
      groupMemberships,
      (row) => [String(row["id"]), `pair:${String(row["personId"])}:${String(row["groupId"])}`],
      onWrite,
    ),
    peopleImportantDate: createWriter(importantDates, byId, onWrite),
    peopleLinkedin: createWriter(
      linkedin,
      (row) => [String(row["id"]), `person:${String(row["personId"])}`],
      onWrite,
    ),
    peoplePhone: createWriter(phones, byId, onWrite),
    peopleRelationship: createWriter(relationships, byId, onWrite),
    peopleSocial: createWriter(socials, byId, onWrite),
    peopleStore: people,
    peopleTag: createWriter(
      tagMemberships,
      (row) => [String(row["id"]), `pair:${String(row["personId"])}:${String(row["tagId"])}`],
      onWrite,
    ),
    peopleWorkHistory: createWriter(workHistory, byId, onWrite),
    phones,
    relationships,
    syncChangeLog: {
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        const seen = new Set(
          syncChangeLog.map(
            (row) =>
              `${String(row["userId"])}:${String(row["serverSequence"])}:${String(row["changeIndex"])}`,
          ),
        );
        for (const row of data) {
          const key = `${String(row["userId"])}:${String(row["serverSequence"])}:${String(row["changeIndex"])}`;
          if (seen.has(key)) {
            throw new Error(`duplicate sync_change_log key ${key}`);
          }
          seen.add(key);
        }
        syncChangeLog.push(...data);
        return { count: data.length };
      },
    },
    tag: createWriter(tags, byId, onWrite),
    tagMemberships,
    tags,
    userSettings: {
      findUnique: async () => ({
        importCompletedAt,
        productAnalyticsEnabled: false,
      }),
      update: async ({ data }: { data: { importCompletedAt?: Date } }) => {
        if (data.importCompletedAt !== undefined) {
          ({ importCompletedAt } = data);
        }
        return { importCompletedAt, productAnalyticsEnabled: false };
      },
    },
  };
}

export function createCtx(userId: string, db: object) {
  return {
    db: db as never,
    log: undefined,
    user: { email: `${userId}@example.com`, id: userId },
  };
}

export function bobMyself() {
  return {
    firstName: "Bob",
    hasAvatar: true,
    id: BOB_ID,
    lastName: "Target",
    myself: true,
    notes: "Live profile",
    userId: BOB_ID,
  };
}

export async function aliceZipBuffer(): Promise<Buffer> {
  const result = await generateExportZip(createCtx(ALICE_ID, createExportDb(aliceFixture())), {
    bonderyVersion: BONDERY_VERSION,
    now: NOW,
  });
  return result.buffer;
}
