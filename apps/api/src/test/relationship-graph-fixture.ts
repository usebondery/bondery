import type { PrismaClient } from "@bondery/db";

/**
 * Fake Prisma client for relationship graph tests. `where` is applied the
 * way Postgres would, so a missing userId filter fails the test.
 */
export type PersonSeed = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string | null;
  middleName: string | null;
  headline: string | null;
  location: string | null;
  myself: boolean | null;
  hasAvatar: boolean;
  avatarUpdatedAt: Date | null;
};

export type EdgeSeed = {
  id: string;
  userId: string;
  sourcePersonId: string;
  targetPersonId: string;
  relationshipType: string;
  createdAt: Date;
};

type PersonWhere = {
  id?: string | { in: string[] };
  myself?: boolean;
  relationshipsFrom?: { none: unknown };
  relationshipsTo?: { none: unknown };
  userId?: string;
};

type EdgeWhere = {
  OR?: Array<{ sourcePersonId?: string; targetPersonId?: string }>;
  userId?: string;
};

type WorkSeed = {
  companyLinkedinId: string | null;
  companyName: string;
  endDate: Date | null;
  personId: string;
  userId: string;
};

type EducationSeed = {
  endDate: Date | null;
  personId: string;
  schoolLinkedinId: string | null;
  schoolName: string;
  userId: string;
};

type HistoryWhere = {
  endDate?: null;
  userId?: string;
};

type GroupSeed = {
  color: string | null;
  emoji: string | null;
  id: string;
  label: string;
  personIds: string[];
  userId: string;
};

type GraphReads = {
  education: number;
  groups: number;
  work: number;
};

export function personMatches(person: PersonSeed, where: PersonWhere | undefined): boolean {
  if (!where) {
    return true;
  }
  if (where.userId && person.userId !== where.userId) {
    return false;
  }
  if (where.myself !== undefined && person.myself !== where.myself) {
    return false;
  }
  if (typeof where.id === "string" && person.id !== where.id) {
    return false;
  }
  if (where.id && typeof where.id === "object" && !where.id.in.includes(person.id)) {
    return false;
  }
  return true;
}

function isUnlinked(person: PersonSeed, edges: EdgeSeed[]): boolean {
  return !edges.some(
    (edge) =>
      edge.userId === person.userId &&
      (edge.sourcePersonId === person.id || edge.targetPersonId === person.id),
  );
}

export function edgeMatches(edge: EdgeSeed, where: EdgeWhere | undefined): boolean {
  if (!where?.userId || edge.userId !== where.userId) {
    return false;
  }
  if (!where.OR) {
    return true;
  }
  return where.OR.some(
    (clause) =>
      (clause.sourcePersonId !== undefined && edge.sourcePersonId === clause.sourcePersonId) ||
      (clause.targetPersonId !== undefined && edge.targetPersonId === clause.targetPersonId),
  );
}

function historyMatches(
  row: { endDate: Date | null; userId: string },
  where: HistoryWhere | undefined,
): boolean {
  if (!where?.userId || row.userId !== where.userId) {
    return false;
  }
  if (where.endDate === null && row.endDate !== null) {
    return false;
  }
  return true;
}

export function createFakeClient(seed: {
  edges: EdgeSeed[];
  education?: EducationSeed[];
  groups?: GroupSeed[];
  people: PersonSeed[];
  work?: WorkSeed[];
}): PrismaClient & { reads: GraphReads } {
  const people = {
    count: async ({ where }: { where?: PersonWhere }) =>
      seed.people.filter(
        (person) =>
          personMatches(person, where) &&
          (!where?.relationshipsFrom || isUnlinked(person, seed.edges)),
      ).length,
    findFirst: async ({ where }: { where: PersonWhere }) =>
      seed.people.find((person) => personMatches(person, where)) ?? null,
    findMany: async ({
      take,
      where,
    }: {
      orderBy?: unknown;
      select?: unknown;
      take?: number;
      where?: PersonWhere;
    }) => {
      const rows = seed.people.filter((person) => {
        if (!personMatches(person, where)) {
          return false;
        }
        if (where?.relationshipsFrom || where?.relationshipsTo) {
          return isUnlinked(person, seed.edges);
        }
        return true;
      });
      const sorted = [...rows].sort((left, right) => {
        const byFirst = left.firstName.localeCompare(right.firstName);
        if (byFirst !== 0) {
          return byFirst;
        }
        const byLast = (left.lastName ?? "").localeCompare(right.lastName ?? "");
        if (byLast !== 0) {
          return byLast;
        }
        return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
      });
      return take === undefined ? sorted : sorted.slice(0, take);
    },
  };

  const peopleRelationship = {
    findMany: async ({
      take,
      where,
    }: {
      orderBy?: unknown;
      select?: unknown;
      take?: number;
      where?: EdgeWhere;
    }) => {
      const rows = seed.edges
        .filter((edge) => edgeMatches(edge, where))
        .sort((left, right) => {
          const byTime = left.createdAt.getTime() - right.createdAt.getTime();
          if (byTime !== 0) {
            return byTime;
          }
          return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
        });
      return take === undefined ? rows : rows.slice(0, take);
    },
  };

  const reads: GraphReads = { education: 0, groups: 0, work: 0 };
  const workRows = seed.work ?? [];
  const educationRows = seed.education ?? [];
  const peopleWorkHistory = {
    findMany: async ({ where }: { select?: unknown; where?: HistoryWhere }) => {
      reads.work += 1;
      return workRows
        .filter((row) => historyMatches(row, where))
        .map((row) => ({
          companyLinkedinId: row.companyLinkedinId,
          companyName: row.companyName,
          endDate: row.endDate,
          peopleLinkedin: { personId: row.personId },
        }));
    },
  };
  const peopleEducationHistory = {
    findMany: async ({ where }: { select?: unknown; where?: HistoryWhere }) => {
      reads.education += 1;
      return educationRows
        .filter((row) => historyMatches(row, where))
        .map((row) => ({
          peopleLinkedin: { personId: row.personId },
          schoolLinkedinId: row.schoolLinkedinId,
          schoolName: row.schoolName,
        }));
    },
  };
  const groupRows = seed.groups ?? [];
  const group = {
    findMany: async ({ where }: { select?: unknown; where?: { userId?: string } }) => {
      reads.groups += 1;
      return groupRows
        .filter((row) => !where?.userId || row.userId === where.userId)
        .map((row) => ({
          color: row.color,
          emoji: row.emoji,
          id: row.id,
          label: row.label,
          people: row.personIds.map((personId) => ({ personId })),
        }));
    },
  };

  return {
    group,
    people,
    peopleEducationHistory,
    peopleRelationship,
    peopleWorkHistory,
    reads,
  } as unknown as PrismaClient & { reads: GraphReads };
}

export function person(id: string, userId: string, firstName: string): PersonSeed {
  return {
    avatarUpdatedAt: null,
    firstName,
    hasAvatar: false,
    headline: null,
    id,
    lastName: null,
    location: null,
    middleName: null,
    myself: false,
    userId,
  };
}

export function edge(
  id: string,
  userId: string,
  sourcePersonId: string,
  targetPersonId: string,
  relationshipType = "friend",
  createdAt = new Date(id.length),
): EdgeSeed {
  return {
    createdAt,
    id,
    relationshipType,
    sourcePersonId,
    targetPersonId,
    userId,
  };
}

export function caller(db: PrismaClient, userId: string) {
  return { db, user: { email: `${userId}@example.com`, id: userId } };
}

export function workRow(
  userId: string,
  personId: string,
  companyName: string,
  endDate: Date | null = null,
  companyLinkedinId: string | null = null,
): WorkSeed {
  return { companyLinkedinId, companyName, endDate, personId, userId };
}

export function schoolRow(
  userId: string,
  personId: string,
  schoolName: string,
  endDate: Date | null = null,
): EducationSeed {
  return { endDate, personId, schoolLinkedinId: null, schoolName, userId };
}
