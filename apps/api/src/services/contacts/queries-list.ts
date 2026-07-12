import type { Contact } from "@bondery/schemas";
import type { PeopleListQuery } from "@bondery/schemas/http";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { attachContactExtras } from "../../lib/contacts/enrichment.js";
import { buildPaginatedResponse } from "../../lib/data/pagination.js";
import { CONTACT_SELECT, extractAvatarOptions } from "../../lib/data/select-fragments.js";
import type { ServiceLog } from "./queries-shared.js";
import { buildPeopleListPagination, queryPeoplePage } from "./query-people-page.js";

export async function listContacts(
  client: SupabaseClient<Database>,
  userId: string,
  query: PeopleListQuery,
  log?: ServiceLog,
) {
  const avatarOptions = extractAvatarOptions(query);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const nextYearStart = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

  const [
    { count: totalContactsCount },
    { count: monthInteractionsCount },
    { count: newContactsYearCount },
    page,
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
    queryPeoplePage(client, userId, query, CONTACT_SELECT, log),
  ]);

  const enrichedContacts = await attachContactExtras(client, userId, page.rows, {
    addresses: true,
    avatarOptions,
  });

  const pagination = buildPeopleListPagination(query, enrichedContacts.length, page.count);

  return {
    ...buildPaginatedResponse("contacts", enrichedContacts as unknown as Contact[], pagination),
    stats: {
      newContactsThisYear: newContactsYearCount || 0,
      thisMonthInteractions: monthInteractionsCount || 0,
      totalContacts: totalContactsCount || 0,
    },
  };
}
