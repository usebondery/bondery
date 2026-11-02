import { prisma } from "@bondery/db";

import {
  countSearchPeopleIdsWithDb,
  type RankedPerson,
  searchPeopleIdsWithDb,
} from "./search-prisma.js";

export type { RankedPerson };

/**
 * Performs fuzzy name search via the `search_people_ids` RPC (pg_trgm).
 * Returns ranked ID+rank pairs ordered by relevance, or `null` on error.
 */
export async function searchPeopleIds(
  userId: string,
  query: string,
  limit: number,
  offset = 0,
  options?: { groupId?: string; tagId?: string; tagIds?: string[]; keepInTouch?: boolean },
): Promise<{ ranked: RankedPerson[] | null; error: string | null }> {
  return searchPeopleIdsWithDb(prisma, userId, query, limit, offset, options);
}

/**
 * Given an array of ranked IDs, restores the relevance ordering on a
 * pre-fetched array of objects that have an `id` field.
 */
export function restoreRankedOrder<T extends { id: string }>(items: T[], rankedIds: string[]): T[] {
  const orderMap = new Map(rankedIds.map((id, i) => [id, i]));
  return [...items].sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
}

/**
 * Returns the total number of fuzzy-search matches via `count_search_people_ids`.
 */
export async function countSearchPeopleIds(
  userId: string,
  query: string,
  options?: { groupId?: string; tagId?: string; tagIds?: string[]; keepInTouch?: boolean },
): Promise<{ count: number | null; error: string | null }> {
  return countSearchPeopleIdsWithDb(prisma, userId, query, options);
}
