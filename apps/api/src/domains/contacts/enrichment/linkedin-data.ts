import { linkedinCompanyUrl } from "@bondery/helpers";
import type { LinkedInDataResponse, ScrapedWorkHistoryEntry } from "@bondery/schemas";
import { internal, notFound } from "../../../lib/platform/errors/http-errors.js";
import { buildLinkedinLogoUrl } from "../../../lib/storage/avatar-urls.js";
import { type DomainContext, DomainError } from "../../_shared/context.js";
import { domainDb } from "../../_shared/domain-db.js";

export async function upsertLinkedInWorkHistory(
  ctx: DomainContext,
  personId: string,
  workHistory: ScrapedWorkHistoryEntry[],
): Promise<{ success: true; count: number }> {
  const { user, log } = ctx;
  const db = domainDb(ctx);

  log?.info(
    { personId, userId: user.id, workHistory, workHistoryCount: workHistory.length },
    "[linkedin-data] POST received",
  );

  const person = await db.people.findFirst({
    select: { id: true },
    where: { id: personId, userId: user.id },
  });

  if (!person) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  const linkedinRow = await db.peopleLinkedin.upsert({
    create: {
      personId,
      userId: user.id,
    },
    update: {
      updatedAt: new Date(),
    },
    where: {
      personId,
    },
  });

  await db.peopleWorkHistory.deleteMany({
    where: { peopleLinkedinId: linkedinRow.id, userId: user.id },
  });

  if (workHistory.length > 0) {
    const rows = workHistory.map((entry) => ({
      companyLinkedinId: entry.companyLinkedinId ?? null,
      companyName: entry.companyName,
      employmentType: entry.employmentType ?? null,
      endDate: entry.endDate ? new Date(entry.endDate) : null,
      location: entry.location ?? null,
      peopleLinkedinId: linkedinRow.id,
      startDate: entry.startDate ? new Date(entry.startDate) : null,
      title: entry.title ?? null,
      userId: user.id,
    }));

    log?.info({ rows }, "[linkedin-data] Inserting rows");

    try {
      await db.peopleWorkHistory.createMany({ data: rows });
    } catch (insertError) {
      log?.error({ insertError }, "[linkedin-data] Insert failed");
      throw internal(
        "contact_enrich_failed",
        insertError instanceof Error ? insertError.message : "contact_enrich_failed",
      );
    }
  }

  log?.info({ count: workHistory.length, personId }, "[linkedin-data] Upsert complete");
  return { count: workHistory.length, success: true };
}

function sortByActiveFirst<T extends { endDate: Date | null; startDate: Date | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const aActive = a.endDate === null;
    const bActive = b.endDate === null;
    if (aActive !== bActive) {
      return aActive ? -1 : 1;
    }
    if (!a.startDate && !b.startDate) {
      return 0;
    }
    if (!a.startDate) {
      return 1;
    }
    if (!b.startDate) {
      return -1;
    }
    return a.startDate > b.startDate ? -1 : 1;
  });
}

export async function getLinkedInData(
  ctx: DomainContext,
  personId: string,
): Promise<LinkedInDataResponse> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const person = await db.people.findFirst({
    select: { id: true },
    where: { id: personId, userId: user.id },
  });
  if (!person) {
    throw notFound("Contact not found", "contact_not_found");
  }

  const linkedinRow = await db.peopleLinkedin.findFirst({
    select: { bio: true, id: true, updatedAt: true },
    where: { personId, userId: user.id },
  });

  if (!linkedinRow) {
    return { education: [], linkedinBio: null, syncedAt: null, workHistory: [] };
  }

  const [workHistory, education] = await Promise.all([
    db.peopleWorkHistory.findMany({
      orderBy: { startDate: "desc" },
      where: { peopleLinkedinId: linkedinRow.id, userId: user.id },
    }),
    db.peopleEducationHistory.findMany({
      orderBy: { startDate: "desc" },
      where: { peopleLinkedinId: linkedinRow.id, userId: user.id },
    }),
  ]);

  return {
    education: sortByActiveFirst(education).map((row) => ({
      createdAt: row.createdAt.toISOString(),
      degree: row.degree,
      description: row.description,
      endDate: row.endDate?.toISOString().slice(0, 10) ?? null,
      id: row.id,
      peopleLinkedinId: row.peopleLinkedinId,
      schoolLinkedinUrl: linkedinCompanyUrl(row.schoolLinkedinId),
      schoolLogoUrl: row.schoolLinkedinId
        ? buildLinkedinLogoUrl(user.id, row.schoolLinkedinId)
        : null,
      schoolName: row.schoolName,
      startDate: row.startDate?.toISOString().slice(0, 10) ?? null,
      updatedAt: row.updatedAt.toISOString(),
      userId: row.userId,
    })),
    linkedinBio: linkedinRow.bio ?? null,
    syncedAt: linkedinRow.updatedAt.toISOString(),
    workHistory: sortByActiveFirst(workHistory).map((row) => ({
      companyLinkedinUrl: linkedinCompanyUrl(row.companyLinkedinId),
      companyLogoUrl: row.companyLinkedinId
        ? buildLinkedinLogoUrl(user.id, row.companyLinkedinId)
        : null,
      companyName: row.companyName,
      createdAt: row.createdAt.toISOString(),
      description: row.description,
      employmentType: row.employmentType,
      endDate: row.endDate?.toISOString().slice(0, 10) ?? null,
      id: row.id,
      location: row.location,
      peopleLinkedinId: row.peopleLinkedinId,
      startDate: row.startDate?.toISOString().slice(0, 10) ?? null,
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
      userId: row.userId,
    })),
  };
}
