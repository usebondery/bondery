import type { ContactSelectable } from "@bondery/schemas";
import type { PeopleListQuery } from "@bondery/schemas/http";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPaginatedResponse } from "../../lib/data/pagination.js";
import {
  extractAvatarOptions,
  SELECTABLE_CONTACT_SELECT,
} from "../../lib/data/select-fragments.js";
import { type ServiceLog, toContactSelectable } from "./queries-shared.js";
import {
  buildPeopleListPagination,
  type PeoplePageRow,
  queryPeoplePage,
} from "./query-people-page.js";

function rowToSelectableInput(row: PeoplePageRow) {
  return {
    firstName: String(row.firstName ?? ""),
    hasAvatar: Boolean(row.hasAvatar),
    headline: (row.headline as string | null | undefined) ?? null,
    id: row.id,
    lastName: (row.lastName as string | null | undefined) ?? null,
    location: (row.location as string | null | undefined) ?? null,
    middleName: (row.middleName as string | null | undefined) ?? null,
    myself: (row.myself as boolean | null | undefined) ?? null,
    updatedAt: (row.updatedAt as string | null | undefined) ?? null,
  };
}

export async function listSelectableContacts(
  client: SupabaseClient<Database>,
  userId: string,
  query: PeopleListQuery,
  log?: ServiceLog,
) {
  const avatarOptions = extractAvatarOptions(query);
  const page = await queryPeoplePage(client, userId, query, SELECTABLE_CONTACT_SELECT, log);

  const contacts: ContactSelectable[] = page.rows.map((row) =>
    toContactSelectable(client, userId, rowToSelectableInput(row), avatarOptions),
  );

  const pagination = buildPeopleListPagination(query, contacts.length, page.count);

  return buildPaginatedResponse("contacts", contacts, pagination);
}
