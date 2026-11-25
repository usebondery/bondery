import type { PrismaClient } from "@bondery/db";

interface RankedPerson {
  id: string;
  rank: number;
}

type SearchPeopleOptions = {
  groupId?: string;
  tagId?: string;
  tagIds?: string[];
  keepInTouch?: boolean;
};

/** Matches `search_people_ids` / `count_search_people_ids` default threshold. */
const PEOPLE_SEARCH_WORD_SIMILARITY_THRESHOLD = 0.3;

export type { RankedPerson };

/**
 * Fuzzy people search via `search_people_ids` (pg_trgm word_similarity).
 */
export async function searchPeopleIdsWithDb(
  db: PrismaClient,
  userId: string,
  query: string,
  options: SearchPeopleOptions & { limit: number; offset?: number },
): Promise<{ ranked: RankedPerson[] | null; error: string | null }> {
  const { limit, offset = 0 } = options;
  try {
    const ranked = await db.$queryRaw<RankedPerson[]>`
      SELECT id, rank FROM search_people_ids(
        ${userId}::uuid,
        ${query},
        ${options.groupId ?? null}::uuid,
        ${options.tagId ?? null}::uuid,
        ${options.keepInTouch ?? false},
        ${PEOPLE_SEARCH_WORD_SIMILARITY_THRESHOLD}::real,
        ${limit}::int,
        ${offset}::int,
        ${options.tagIds && options.tagIds.length > 0 ? options.tagIds : null}::uuid[]
      )
    `;
    return { error: null, ranked };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "unknown",
      ranked: null,
    };
  }
}

export async function countSearchPeopleIdsWithDb(
  db: PrismaClient,
  userId: string,
  query: string,
  options?: SearchPeopleOptions,
): Promise<{ count: number | null; error: string | null }> {
  try {
    const rows = await db.$queryRaw<{ count: number }[]>`
      SELECT count_search_people_ids(
        ${userId}::uuid,
        ${query},
        ${options?.groupId ?? null}::uuid,
        ${options?.tagId ?? null}::uuid,
        ${options?.keepInTouch ?? false},
        ${PEOPLE_SEARCH_WORD_SIMILARITY_THRESHOLD}::real,
        ${options?.tagIds && options.tagIds.length > 0 ? options.tagIds : null}::uuid[]
      ) AS count
    `;
    const count = rows[0]?.count;
    return {
      count: typeof count === "number" ? count : Number(count ?? 0),
      error: null,
    };
  } catch (error) {
    return {
      count: null,
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}
