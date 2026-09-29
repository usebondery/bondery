import type { PrismaClient } from "@bondery/db";
import { searchPeopleIdsWithDb } from "../data/search-prisma.js";
import { badRequest, internal } from "../platform/errors/http-errors.js";

export type ResolveContactPersonIdsExplicitBody = {
  personIds: string[];
};

export type ResolveContactPersonIdsFilterBody = {
  contactFilter: { search?: string; sort?: string };
  excludePersonIds?: string[];
};

export type ResolveContactPersonIdsBody =
  | ResolveContactPersonIdsExplicitBody
  | ResolveContactPersonIdsFilterBody;

/**
 * Resolves contact person IDs from an explicit list or a contacts-list filter.
 * Filter scope matches DELETE /api/contacts (all non-myself contacts, optional fuzzy search).
 */
export async function resolveContactPersonIds(
  db: PrismaClient,
  userId: string,
  body: ResolveContactPersonIdsBody,
  options?: {
    rejectEmptyExplicit?: boolean;
    emptyExplicitError?: string;
    onlyMyselfError?: string;
  },
): Promise<string[]> {
  if ("personIds" in body && Array.isArray(body.personIds)) {
    let uniqueIds = Array.from(new Set(body.personIds.filter(Boolean)));

    if (uniqueIds.length === 0) {
      if (options?.rejectEmptyExplicit) {
        throw badRequest(
          options.emptyExplicitError ??
            "Invalid request body. 'personIds' must be a non-empty array.",
          "contact_ids_empty",
        );
      }

      return [];
    }

    const myselfRows = await db.people.findMany({
      select: { id: true },
      where: { id: { in: uniqueIds }, myself: true, userId },
    });
    const myselfIds = new Set(myselfRows.map((row) => row.id));
    uniqueIds = uniqueIds.filter((id) => !myselfIds.has(id));

    if (uniqueIds.length === 0 && options?.rejectEmptyExplicit) {
      throw badRequest(
        options.onlyMyselfError ?? "No contacts found. Your own contact card cannot be included.",
        "contact_ids_only_myself",
      );
    }

    if (uniqueIds.length === 0) {
      return [];
    }

    const ownedRows = await db.people.findMany({
      select: { id: true },
      where: { id: { in: uniqueIds }, userId },
    });
    const ownedIds = new Set(ownedRows.map((row) => row.id));
    return uniqueIds.filter((id) => ownedIds.has(id));
  }

  if ("contactFilter" in body && body.contactFilter) {
    const search =
      typeof body.contactFilter.search === "string" ? body.contactFilter.search.trim() : "";

    if (search) {
      const { ranked, error: rpcError } = await searchPeopleIdsWithDb(db, userId, search, 10000, 0);

      if (rpcError) {
        throw internal("contact_ids_search_failed", rpcError);
      }

      const excludeSet = new Set(body.excludePersonIds ?? []);
      return (ranked || []).map((row) => row.id).filter((id) => !excludeSet.has(id));
    }

    const rows = await db.people.findMany({
      select: { id: true },
      where: { myself: false, userId },
    });

    const excludeSet = new Set(body.excludePersonIds ?? []);
    return rows.map((row) => row.id).filter((id) => !excludeSet.has(id));
  }

  throw badRequest(
    "Invalid request body. Provide either 'personIds' or 'contactFilter'.",
    "contact_ids_invalid_body",
  );
}
