import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/schemas/supabase.types";

export interface RankedPerson {
  id: string;
  rank: number;
}

/**
 * Performs fuzzy name search via the `search_people_ids` RPC (pg_trgm).
 * Returns ranked ID+rank pairs ordered by relevance, or `null` on error.
 *
 * @param supabase - Authenticated Supabase client (RLS-enforced).
 * @param userId   - The authenticated user's ID.
 * @param query    - Free-text search query.
 * @param limit    - Maximum results.
 * @param offset   - Pagination offset.
 * @param groupId  - Optional group scope (filters to members of this group).
 */
export async function searchPeopleIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: string,
  limit: number,
  offset = 0,
  options?: { groupId?: string; tagId?: string; keepInTouch?: boolean },
): Promise<{ ranked: RankedPerson[] | null; error: string | null }> {
  const params: Record<string, unknown> = {
    p_user_id: userId,
    p_query: query,
    p_limit: limit,
    p_offset: offset,
    p_keep_in_touch: options?.keepInTouch ?? false,
  };
  if (options?.groupId) {
    params.p_group_id = options.groupId;
  }
  if (options?.tagId) {
    params.p_tag_id = options.tagId;
  }

  const { data: ranked, error } = await supabase.rpc("search_people_ids", params as any);

  if (error) {
    return { ranked: null, error: error.message };
  }

  return {
    ranked: (ranked ?? []) as RankedPerson[],
    error: null,
  };
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
  supabase: SupabaseClient<Database>,
  userId: string,
  query: string,
  options?: { groupId?: string; tagId?: string; keepInTouch?: boolean },
): Promise<{ count: number | null; error: string | null }> {
  const params: Record<string, unknown> = {
    p_user_id: userId,
    p_query: query,
    p_keep_in_touch: options?.keepInTouch ?? false,
  };
  if (options?.groupId) {
    params.p_group_id = options.groupId;
  }
  if (options?.tagId) {
    params.p_tag_id = options.tagId;
  }

  const { data, error } = await supabase.rpc(
    "count_search_people_ids" as keyof Database["public"]["Functions"],
    params as Database["public"]["Functions"]["count_search_people_ids"]["Args"],
  );

  if (error) {
    return { count: null, error: error.message };
  }

  const count = typeof data === "number" ? data : Number(data);
  return {
    count: Number.isFinite(count) ? count : 0,
    error: null,
  };
}
