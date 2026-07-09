import type { Contact } from "@bondery/schemas";
import type { PeopleListQuery } from "@bondery/schemas/http";
import type { Database } from "@bondery/schemas/supabase.types";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { attachContactExtras, type FullContactExtras } from "../../lib/contacts/enrichment.js";
import {
  buildPaginatedResponse,
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
import { CONTACT_SELECT, extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { withEmptyChannels, withEmptySocials } from "./helpers.js";
import type { ServiceLog } from "./queries-shared.js";

export async function listContacts(
  client: SupabaseClient<Database>,
  userId: string,
  query: PeopleListQuery,
  log?: ServiceLog,
) {
  const avatarOptions = extractAvatarOptions(query);
  const { limit, offset } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const effectiveSort = resolveSort(query.sort, "nameAsc");

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const nextYearStart = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

  const [
    { count: totalContactsCount },
    { count: monthInteractionsCount },
    { count: newContactsYearCount },
  ] = await Promise.all([
    client
      .from("people")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("myself", false),
    client
      .from("interactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("date", monthStart.toISOString())
      .lt("date", nextMonthStart.toISOString()),
    client
      .from("people")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("myself", false)
      .not("created_at", "is", null)
      .gte("created_at", yearStart.toISOString())
      .lt("created_at", nextYearStart.toISOString()),
  ]);

  let contacts: Contact[] | null = null;
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
      contacts = [];
    } else {
      const rankedIds = searchResult.ranked.map((r) => r.id);

      const { data: fetchedContacts, error: fetchError } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .in("id", rankedIds);

      if (fetchError) {
        log?.error({ err: fetchError }, "Error fetching fuzzy search results");
        throw internal("internal_server_error", fetchError.message);
      }

      contacts = restoreRankedOrder(fetchedContacts || [], rankedIds);
    }
  } else {
    let peopleQuery = client
      .from("people")
      .select(CONTACT_SELECT, { count: "exact" })
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
    contacts = result.data;
    count = result.count;
    error = result.error;
  }

  if (error) {
    log?.error({ err: error }, "Error fetching contacts");
    throw internal("internal_server_error", error.message);
  }

  let enrichedContacts: Array<{ id: string } & FullContactExtras> = [];
  try {
    enrichedContacts = await attachContactExtras(client, userId, contacts || [], {
      addresses: true,
      avatarOptions,
    });
  } catch (enrichError) {
    log?.error({ enrichError }, "Failed to attach contact extras for contact list");
    enrichedContacts = withEmptySocials(withEmptyChannels(contacts || []));
  }

  const totalCount = typeof count === "number" ? count : enrichedContacts.length;
  const pagination = buildPaginationMeta({
    itemCount: enrichedContacts.length,
    limit,
    offset,
    search,
    sort: effectiveSort,
    totalCount,
  });

  return {
    ...buildPaginatedResponse("contacts", enrichedContacts as Contact[], pagination),
    stats: {
      newContactsThisYear: newContactsYearCount || 0,
      thisMonthInteractions: monthInteractionsCount || 0,
      totalContacts: totalContactsCount || 0,
    },
  };
}
