import type { PeopleListQuery } from "@bondery/schemas/http";
import type { Database } from "@bondery/schemas/supabase.types";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  buildPaginationMeta,
  normalizeSearch,
  parsePagination,
  resolveSort,
} from "../../lib/data/pagination.js";
import {
  countSearchPeopleIds,
  restoreRankedOrder,
  searchPeopleIds,
} from "../../lib/data/search.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import type { ServiceLog } from "./queries-shared.js";

export type PeoplePageRow = {
  id: string;
  hasAvatar: boolean;
  updatedAt?: string;
  [key: string]: unknown;
};

export type QueryPeoplePageResult = {
  rows: PeoplePageRow[];
  count: number | null;
};

export async function queryPeoplePage(
  client: SupabaseClient<Database>,
  userId: string,
  query: PeopleListQuery,
  select: string,
  log?: ServiceLog,
): Promise<QueryPeoplePageResult> {
  const { limit, offset } = parsePagination(query);
  const search = normalizeSearch(query.search);

  let rows: PeoplePageRow[] = [];
  let count: number | null = null;
  let error: PostgrestError | null = null;

  if (search) {
    const keepInTouch = Boolean(query.keepInTouch);
    const [searchResult, countResult] = await Promise.all([
      searchPeopleIds(client, userId, search, limit, offset, { keepInTouch }),
      countSearchPeopleIds(client, userId, search, { keepInTouch }),
    ]);

    if (searchResult.error) {
      log?.error({ err: searchResult.error }, "Error in fuzzy search RPC");
      throw internal("internal_server_error", searchResult.error);
    }

    if (countResult.error) {
      log?.error({ err: countResult.error }, "Error in fuzzy search count RPC");
      throw internal("internal_server_error", countResult.error);
    }

    count = countResult.count ?? 0;

    if (!searchResult.ranked || searchResult.ranked.length === 0) {
      rows = [];
    } else {
      const rankedIds = searchResult.ranked.map((r) => r.id);

      const { data: fetchedContacts, error: fetchError } = await client
        .from("people")
        .select(select)
        .in("id", rankedIds);

      if (fetchError) {
        log?.error({ err: fetchError }, "Error fetching fuzzy search results");
        throw internal("internal_server_error", fetchError.message);
      }

      rows = restoreRankedOrder((fetchedContacts || []) as PeoplePageRow[], rankedIds);
    }
  } else {
    let peopleQuery = client
      .from("people")
      .select(select, { count: "exact" })
      .eq("user_id", userId)
      .eq("myself", false);

    if (query.keepInTouch) {
      peopleQuery = peopleQuery.not("keep_frequency_days", "is", null);
    }

    switch (query.sort) {
      case "nameAsc":
        peopleQuery = peopleQuery.order("first_name", { ascending: true });
        break;
      case "nameDesc":
        peopleQuery = peopleQuery.order("first_name", { ascending: false });
        break;
      case "surnameAsc":
        peopleQuery = peopleQuery.order("last_name", {
          ascending: true,
          nullsFirst: true,
        });
        break;
      case "surnameDesc":
        peopleQuery = peopleQuery.order("last_name", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "interactionAsc":
        peopleQuery = peopleQuery.order("last_interaction", {
          ascending: true,
          nullsFirst: true,
        });
        break;
      case "interactionDesc":
        peopleQuery = peopleQuery.order("last_interaction", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "createdAtAsc":
        peopleQuery = peopleQuery.order("created_at", {
          ascending: true,
          nullsFirst: true,
        });
        break;
      case "createdAtDesc":
        peopleQuery = peopleQuery.order("created_at", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      default:
        peopleQuery = peopleQuery.order("first_name", { ascending: true });
        break;
    }

    peopleQuery = peopleQuery.range(offset, offset + limit - 1);

    const result = await peopleQuery;
    rows = (result.data || []) as PeoplePageRow[];
    count = result.count;
    error = result.error;
  }

  if (error) {
    log?.error({ err: error }, "Error fetching contacts");
    throw internal("internal_server_error", error.message);
  }

  return { count, rows };
}

export function buildPeopleListPagination(
  query: PeopleListQuery,
  itemCount: number,
  totalCount: number | null,
) {
  const { limit, offset } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const effectiveSort = resolveSort(query.sort, "nameAsc");

  return buildPaginationMeta({
    itemCount,
    limit,
    offset,
    search,
    sort: effectiveSort,
    totalCount: typeof totalCount === "number" ? totalCount : itemCount,
  });
}
