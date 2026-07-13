import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchPeopleIds } from "../data/search.js";
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
  client: SupabaseClient<Database>,
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
      const { ranked, error: rpcError } = await searchPeopleIds(client, userId, search, 10000, 0, {
        groupId,
      });

      if (rpcError) {
        throw internal("group_member_ids_search_failed", rpcError);
      }

      const excludeSet = new Set(body.excludePersonIds ?? []);
      return (ranked || []).map((row) => row.id).filter((id) => !excludeSet.has(id));
    }

    const { data: rows, error: filterError } = await client
      .from("people")
      .select("id, people_groups!inner(group_id)")
      .eq("myself", false)
      .eq("people_groups.group_id", groupId);

    if (filterError) {
      throw internal("group_member_ids_filter_failed", filterError);
    }

    const excludeSet = new Set(body.excludePersonIds ?? []);
    return (rows || [])
      .map((row: { id: string }) => row.id)
      .filter((id: string) => !excludeSet.has(id));
  }

  throw badRequest(
    "Invalid request body. Provide either 'personIds' or 'memberFilter'.",
    "group_member_ids_invalid_body",
  );
}
