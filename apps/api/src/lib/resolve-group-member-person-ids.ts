import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/schemas/supabase.types";
import { searchPeopleIds } from "./search.js";

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

export class ResolveGroupMemberPersonIdsError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "ResolveGroupMemberPersonIdsError";
  }
}

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
        throw new ResolveGroupMemberPersonIdsError(
          options.emptyExplicitError ??
            "Invalid request body. 'personIds' must be a non-empty array.",
          400,
        );
      }

      return [];
    }

    return uniqueIds;
  }

  if ("memberFilter" in body && body.memberFilter) {
    const search =
      typeof body.memberFilter.search === "string"
        ? body.memberFilter.search.trim()
        : "";

    if (search) {
      const { ranked, error: rpcError } = await searchPeopleIds(
        client,
        userId,
        search,
        10000,
        0,
        { groupId },
      );

      if (rpcError) {
        throw new ResolveGroupMemberPersonIdsError(rpcError, 500);
      }

      const excludeSet = new Set(body.excludePersonIds ?? []);
      return (ranked || [])
        .map((row) => row.id)
        .filter((id) => !excludeSet.has(id));
    }

    const { data: rows, error: filterError } = await client
      .from("people")
      .select("id, people_groups!inner(group_id)")
      .eq("myself", false)
      .eq("people_groups.group_id", groupId);

    if (filterError) {
      throw new ResolveGroupMemberPersonIdsError(filterError.message, 500);
    }

    const excludeSet = new Set(body.excludePersonIds ?? []);
    return (rows || [])
      .map((row: { id: string }) => row.id)
      .filter((id: string) => !excludeSet.has(id));
  }

  throw new ResolveGroupMemberPersonIdsError(
    "Invalid request body. Provide either 'personIds' or 'memberFilter'.",
    400,
  );
}
