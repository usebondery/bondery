/**
 * An in-memory stand-in for the Prisma client the import commit steps use.
 *
 * The commit path reads before it writes: it looks up an existing social handle, checks for an
 * existing email, and finds the default import group. This fake records every row it is given and
 * answers those reads, so a test asserts on stored rows rather than on a return count.
 *
 * It is deliberately small: only the models and methods the three commit steps touch. A missing
 * method fails loudly, which is better than a silent default.
 */

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

const DEFAULT_ID_PREFIX = "0192f2a0-0000-7000-8000-0000000000";

/** A Prisma `Sql` fragment, as `Prisma.raw` and `Prisma.join` build it. */
interface SqlFragment {
  sql?: string;
  values?: unknown[];
}

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/** A stored row as the bootstrap query returns it: snake_case keys and ISO dates. */
function toRawRow(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    out[toSnakeCase(key)] = value instanceof Date ? value.toISOString() : value;
  }
  return out;
}

interface ImportDb {
  readonly addresses: Row[];
  readonly emails: Row[];
  /** How many raw SQL statements ran. */
  getRawCalls: () => number;
  /** Total rows written across every table, so "nothing was written" is assertable. */
  getWrites: () => number;
  readonly groupMemberships: Row[];
  readonly groups: Row[];
  readonly importantDates: Row[];
  /** Every person row, in insert order. `people` is the Prisma-shaped table. */
  readonly peopleRows: Row[];
  readonly phones: Row[];
  readonly socials: Row[];
  /** Every changelog row, in insert order. `syncChangeLog` is the Prisma-shaped table. */
  readonly syncChangeLogRows: Row[];
  readonly tagMemberships: Row[];
  readonly tags: Row[];
}

/** Applies the subset of `where` a commit step uses: equality, `in`, and a null check. */
function matches(row: Row, where: Where | undefined): boolean {
  if (where === undefined) {
    return true;
  }
  return Object.entries(where).every(([key, expected]) => {
    if (expected !== null && typeof expected === "object" && "in" in expected) {
      const list = (expected as { in: unknown[] }).in;
      return list.includes(row[key]);
    }
    return row[key] === expected;
  });
}

function selectFields(row: Row, select: Record<string, boolean> | undefined): Row {
  if (select === undefined) {
    return row;
  }
  const out: Row = {};
  for (const [key, wanted] of Object.entries(select)) {
    if (wanted) {
      out[key] = row[key];
    }
  }
  return out;
}

/**
 * A table with the methods a commit step calls: bulk writers, one create, and two reads.
 *
 * Prisma returns promises, so every method is async even when the answer is already known.
 */
function createTable(
  rows: Row[],
  onWrite: () => void,
  mintId: () => string,
  options: { unique?: (row: Row) => string[] } = {},
) {
  const keyOf = (row: Row): string[] =>
    options.unique === undefined ? [String(row["id"])] : options.unique(row);
  const seen = (row: Row): boolean => {
    const keys = new Set(keyOf(row));
    return rows.some((existing) => keyOf(existing).some((key) => keys.has(key)));
  };

  return {
    count: async (args?: { where?: Where }) =>
      rows.filter((row) => matches(row, args?.where)).length,
    create: async ({ data, select }: { data: Row; select?: Record<string, boolean> }) => {
      const row = { id: mintId(), ...data };
      rows.push(row);
      onWrite();
      return selectFields(row, select);
    },
    createMany: async ({ data, skipDuplicates }: { data: Row[]; skipDuplicates?: boolean }) => {
      let count = 0;
      for (const entry of data) {
        const row = { id: mintId(), ...entry };
        if (skipDuplicates === true && seen(row)) {
          continue;
        }
        rows.push(row);
        onWrite();
        count += 1;
      }
      return { count };
    },
    createManyAndReturn: async ({
      data,
      skipDuplicates,
    }: {
      data: Row[];
      skipDuplicates?: boolean;
    }) => {
      const inserted: Row[] = [];
      for (const entry of data) {
        const row = { id: mintId(), ...entry };
        if (skipDuplicates === true && seen(row)) {
          continue;
        }
        rows.push(row);
        onWrite();
        inserted.push(row);
      }
      return inserted;
    },
    findFirst: async (args?: { select?: Record<string, boolean>; where?: Where }) => {
      const found = rows.find((row) => matches(row, args?.where));
      return found === undefined ? null : selectFields(found, args?.select);
    },
    findMany: async (args?: { select?: Record<string, boolean>; where?: Where }) =>
      rows.filter((row) => matches(row, args?.where)).map((row) => selectFields(row, args?.select)),
    rows,
    updateMany: async ({ data, where }: { data: Row; where?: Where }) => {
      let count = 0;
      for (const row of rows) {
        if (matches(row, where)) {
          Object.assign(row, data);
          onWrite();
          count += 1;
        }
      }
      return { count };
    },
  };
}

function createImportDb(seed: { people?: Row[] } = {}): ImportDb & Record<string, unknown> {
  const people: Row[] = [...(seed.people ?? [])];
  const groups: Row[] = [];
  const tags: Row[] = [];
  const phones: Row[] = [];
  const emails: Row[] = [];
  const socials: Row[] = [];
  const addresses: Row[] = [];
  const importantDates: Row[] = [];
  const groupMemberships: Row[] = [];
  const tagMemberships: Row[] = [];
  const syncChangeLog: Row[] = [];
  let writes = 0;
  let rawCalls = 0;
  let nextId = 1;

  let lastSequence = 0;

  const mintId = () => `${DEFAULT_ID_PREFIX}${String(nextId++).padStart(2, "0")}`;
  const onWrite = () => {
    writes += 1;
  };

  const peopleTable = createTable(people, onWrite, mintId, {
    // A person is unique by id; the import path never relies on a natural key.
  });

  const rowsByTable: Record<string, Row[]> = {
    groups,
    people,
    people_addresses: addresses,
    people_emails: emails,
    people_groups: groupMemberships,
    people_important_dates: importantDates,
    people_phones: phones,
    people_socials: socials,
    people_tags: tagMemberships,
    tags,
  };

  /**
   * Answers the two raw reads the sync writer makes: the sequence allocator and the bootstrap
   * row read-back (`SELECT * FROM <table> WHERE ... IN (<ids>)`). Anything else fails loudly.
   */
  const queryRaw = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    if (text.includes("allocate_sync_server_sequence")) {
      const count = Number(values[1] ?? 1);
      const first = lastSequence + 1;
      lastSequence += count;
      return [{ allocate_sync_server_sequence: BigInt(first) }];
    }
    if (text.includes("SELECT * FROM")) {
      const table = (values[0] as SqlFragment).sql?.trim() ?? "";
      const ids = new Set((values.at(-1) as SqlFragment).values ?? []);
      return (rowsByTable[table] ?? [])
        .filter((row) => ids.has(row["id"]))
        .map((row) => toRawRow(row));
    }
    throw new Error(`The in-memory database does not answer this raw query: ${text}`);
  };

  const client: Record<string, unknown> = {
    $executeRaw: async () => {
      rawCalls += 1;
      return 1;
    },
    $queryRaw: queryRaw,
    addresses,
    emails,
    getRawCalls: () => rawCalls,
    getWrites: () => writes,
    group: createTable(groups, onWrite, mintId),
    groupMemberships,
    groups,
    importantDates,
    people: peopleTable,
    peopleAddress: createTable(addresses, onWrite, mintId),
    peopleEmail: createTable(emails, onWrite, mintId),
    peopleGroup: createTable(groupMemberships, onWrite, mintId, {
      unique: (row) => [`${String(row["personId"])}:${String(row["groupId"])}`],
    }),
    peopleImportantDate: createTable(importantDates, onWrite, mintId),
    peoplePhone: createTable(phones, onWrite, mintId),
    peopleRows: people,
    peopleSocial: createTable(socials, onWrite, mintId, {
      unique: (row) => [`${String(row["personId"])}:${String(row["platform"])}`],
    }),
    peopleTag: createTable(tagMemberships, onWrite, mintId, {
      unique: (row) => [`${String(row["personId"])}:${String(row["tagId"])}`],
    }),
    phones,
    socials,
    syncChangeLog: {
      createMany: async ({ data }: { data: Row[] }) => {
        syncChangeLog.push(...data);
        writes += data.length;
        return { count: data.length };
      },
    },
    syncChangeLogRows: syncChangeLog,
    tag: createTable(tags, onWrite, mintId),
    tagMemberships,
    tags,
    userSettings: {
      findUnique: async () => ({ importCompletedAt: null, productAnalyticsEnabled: false }),
      update: async ({ data }: { data: { importCompletedAt?: Date } }) => ({
        importCompletedAt: data.importCompletedAt ?? null,
        productAnalyticsEnabled: false,
      }),
    },
  };

  // A transaction client is the same tables without `$transaction`, as in Prisma. The fake does
  // not roll back: no test here depends on it.
  client["$transaction"] = async (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
    const { $transaction: _omitted, ...tx } = client;
    return fn(tx);
  };

  return client as ImportDb & Record<string, unknown>;
}

/** A domain context for the commit steps: the user id plus the in-memory client. */
function createImportCtx(userId: string, db: Record<string, unknown>) {
  return {
    db: db as never,
    log: undefined,
    user: { email: `${userId}@example.test`, id: userId },
  };
}

export type { ImportDb };
export { createImportCtx, createImportDb };
