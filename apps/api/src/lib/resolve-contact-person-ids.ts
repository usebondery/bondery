import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/schemas/supabase.types";
import { searchPeopleIds } from "./search";

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

export class ResolveContactPersonIdsError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "ResolveContactPersonIdsError";
  }
}

/**
 * Resolves contact person IDs from an explicit list or a contacts-list filter.
 * Filter scope matches DELETE /api/contacts (all non-myself contacts, optional fuzzy search).
 */
export async function resolveContactPersonIds(
  client: SupabaseClient<Database>,
  userId: string,
  body: ResolveContactPersonIdsBody,
  options?: {
    /** When true, reject explicit lists that are empty or contain only myself. */
    rejectEmptyExplicit?: boolean;
    emptyExplicitError?: string;
    onlyMyselfError?: string;
  },
): Promise<string[]> {
  if ("personIds" in body && Array.isArray(body.personIds)) {
    let uniqueIds = Array.from(new Set(body.personIds.filter(Boolean)));

    if (uniqueIds.length === 0) {
      if (options?.rejectEmptyExplicit) {
        throw new ResolveContactPersonIdsError(
          options.emptyExplicitError ??
            "Invalid request body. 'personIds' must be a non-empty array.",
          400,
        );
      }

      return [];
    }

    const { data: myselfRows } = await client
      .from("people")
      .select("id")
      .eq("user_id", userId)
      .eq("myself", true)
      .in("id", uniqueIds);
    const myselfIds = new Set(
      (myselfRows ?? []).map((row: { id: string }) => row.id),
    );
    uniqueIds = uniqueIds.filter((id) => !myselfIds.has(id));

    if (uniqueIds.length === 0 && options?.rejectEmptyExplicit) {
      throw new ResolveContactPersonIdsError(
        options.onlyMyselfError ??
          "No contacts found. Your own contact card cannot be included.",
        400,
      );
    }

    return uniqueIds;
  }

  if ("contactFilter" in body && body.contactFilter) {
    const search =
      typeof body.contactFilter.search === "string"
        ? body.contactFilter.search.trim()
        : "";

    if (search) {
      const { ranked, error: rpcError } = await searchPeopleIds(
        client,
        userId,
        search,
        10000,
      );

      if (rpcError) {
        throw new ResolveContactPersonIdsError(rpcError, 500);
      }

      const excludeSet = new Set(body.excludePersonIds ?? []);
      return (ranked || [])
        .map((row) => row.id)
        .filter((id) => !excludeSet.has(id));
    }

    const { data: rows, error: filterError } = await client
      .from("people")
      .select("id")
      .eq("user_id", userId)
      .eq("myself", false);

    if (filterError) {
      throw new ResolveContactPersonIdsError(filterError.message, 500);
    }

    const excludeSet = new Set(body.excludePersonIds ?? []);
    return (rows || [])
      .map((row: { id: string }) => row.id)
      .filter((id: string) => !excludeSet.has(id));
  }

  throw new ResolveContactPersonIdsError(
    "Invalid request body. Provide either 'personIds' or 'contactFilter'.",
    400,
  );
}
