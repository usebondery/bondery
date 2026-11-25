import type { PrismaClient } from "@bondery/db";
import { searchPeopleIdsWithDb } from "../data/search-prisma.js";
import { badRequest, internal } from "../platform/errors/http-errors.js";

export type ResolveGroupMemberPersonIdsExplicitBody = {
  personIds: string[];
};

export type ResolveGroupMemberPersonIdsFilterBody = {
  memberFilter: { search?: string; sort?: string };
  excludePersonIds?: string[];
};

export type ResolveGroupMemberPersonIdsBody =
  | ResolveGroupMemberPersonIdsExplicitBody
  | ResolveGroupMemberPersonIdsFilterBody;

/**
 * Resolves person IDs from an explicit list or a group-member filter.
 * Filter scope is limited to existing members of the target group.
 */
export async function resolveGroupMemberPersonIds(
  db: PrismaClient,
  userId: string,
  groupId: string,
  body: ResolveGroupMemberPersonIdsBody,
  options?: {
    rejectEmptyExplicit?: boolean;
    emptyExplicitError?: string;
  },
): Promise<string[]> {
  if ("personIds" in body && Array.isArray(body.personIds)) {
    const uniqueIds = Array.from(new Set(body.personIds.filter(Boolean)));

    if (uniqueIds.length === 0) {
      if (options?.rejectEmptyExplicit) {
        throw badRequest(
          options.emptyExplicitError ??
            "Invalid request body. 'personIds' must be a non-empty array.",
          "group_member_ids_empty",
        );
      }

      return [];
    }

    return uniqueIds;
  }

  if ("memberFilter" in body && body.memberFilter) {
    const search =
      typeof body.memberFilter.search === "string" ? body.memberFilter.search.trim() : "";

    if (search) {
      const { ranked, error: rpcError } = await searchPeopleIdsWithDb(db, userId, search, {
        groupId,
        limit: 10_000,
      });

      if (rpcError) {
        throw internal("group_member_ids_search_failed", rpcError);
      }

      const excludeSet = new Set(body.excludePersonIds ?? []);
      return (ranked ?? []).map((row) => row.id).filter((id) => !excludeSet.has(id));
    }

    const rows = await db.people.findMany({
      select: { id: true },
      where: {
        groups: { some: { groupId } },
        myself: false,
        userId,
      },
    });

    const excludeSet = new Set(body.excludePersonIds ?? []);
    return rows.map((row) => row.id).filter((id) => !excludeSet.has(id));
  }

  throw badRequest(
    "Invalid request body. Provide either 'personIds' or 'memberFilter'.",
    "group_member_ids_invalid_body",
  );
}
