import type { domainDb } from "../../domains/_shared/domain-db.js";
import type { EducationHistoryRow, GraphGroupInput, WorkHistoryRow } from "./graph-hubs.js";

type GraphDb = ReturnType<typeof domainDb>;

type OverlayFlags = {
  includeGroups: boolean;
  includeHubs: boolean;
};

async function listWork(db: GraphDb, userId: string): Promise<WorkHistoryRow[]> {
  const rows = await db.peopleWorkHistory.findMany({
    select: {
      companyLinkedinId: true,
      companyName: true,
      endDate: true,
      peopleLinkedin: { select: { personId: true } },
    },
    where: { userId },
  });
  return rows.map((row) => ({
    companyLinkedinId: row.companyLinkedinId,
    companyName: row.companyName,
    endDate: row.endDate,
    personId: row.peopleLinkedin.personId,
  }));
}

async function listEducation(db: GraphDb, userId: string): Promise<EducationHistoryRow[]> {
  const rows = await db.peopleEducationHistory.findMany({
    select: {
      peopleLinkedin: { select: { personId: true } },
      schoolLinkedinId: true,
      schoolName: true,
    },
    where: { userId },
  });
  return rows.map((row) => ({
    personId: row.peopleLinkedin.personId,
    schoolLinkedinId: row.schoolLinkedinId,
    schoolName: row.schoolName,
  }));
}

async function listGroups(db: GraphDb, userId: string): Promise<GraphGroupInput[]> {
  const rows = await db.group.findMany({
    select: {
      color: true,
      emoji: true,
      id: true,
      label: true,
      people: { select: { personId: true }, where: { userId } },
    },
    where: { userId },
  });
  return rows.map((row) => ({
    color: row.color,
    emoji: row.emoji,
    id: row.id,
    label: row.label,
    personIds: row.people.map((person) => person.personId),
  }));
}

/** People with no relationship row. Edge-cap truncation must not re-admit them as hub-only. */
export async function listUnlinkedIds(
  db: GraphDb,
  userId: string,
  ids: readonly string[],
): Promise<Set<string>> {
  if (ids.length === 0) {
    return new Set();
  }
  const rows = await db.people.findMany({
    select: { id: true },
    where: {
      id: { in: [...ids] },
      relationshipsFrom: { none: { userId } },
      relationshipsTo: { none: { userId } },
      userId,
    },
  });
  return new Set(rows.map((row) => row.id));
}

/** History and groups load only when the matching query flag is on. */
export async function loadOverlays(
  db: GraphDb,
  userId: string,
  flags: OverlayFlags,
): Promise<{
  education: EducationHistoryRow[];
  groups: GraphGroupInput[];
  work: WorkHistoryRow[];
}> {
  const [work, education, groups] = await Promise.all([
    flags.includeHubs ? listWork(db, userId) : Promise.resolve([]),
    flags.includeHubs ? listEducation(db, userId) : Promise.resolve([]),
    flags.includeGroups ? listGroups(db, userId) : Promise.resolve([]),
  ]);
  return { education, groups, work };
}
