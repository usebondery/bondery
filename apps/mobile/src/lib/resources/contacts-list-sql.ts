export type ContactsListParams = {
  query?: string;
  limit?: number;
  offset?: number;
  excludeMyself?: boolean;
  groupId?: string;
};

export type ContactsListQuery = {
  fromClause: string;
  whereClause: string;
  params: (string | number)[];
};

export type ContactsListSql = {
  sql: string;
  params: (string | number)[];
};

export const CONTACTS_LIST_ORDER_BY = "ORDER BY p.first_name ASC, p.last_name ASC";

/** Lean people columns for list rows. Omits `notes` and `notes_updated_at`. */
export const CONTACTS_LIST_COLUMNS = [
  "p.id",
  "p.user_id",
  "p.first_name",
  "p.middle_name",
  "p.last_name",
  "p.headline",
  "p.location",
  "p.last_interaction",
  "p.has_avatar",
  "p.avatar_updated_at",
  "p.myself",
  "p.created_at",
  "p.updated_at",
  "p.keep_frequency_days",
  "p.language",
  "p.timezone",
  "p.last_interaction_activity_id",
  "p.gis_point",
].join(", ");

export function buildContactsListQuery(
  options: Pick<ContactsListParams, "query" | "excludeMyself" | "groupId">,
): ContactsListQuery {
  const query = options.query?.trim() ?? "";
  const excludeMyself = options.excludeMyself ?? true;

  let fromClause = "FROM people p";
  const params: (string | number)[] = [];
  const conditions: string[] = [];

  if (options.groupId) {
    fromClause = "FROM people p INNER JOIN people_groups pg ON pg.person_id = p.id";
    conditions.push("pg.group_id = ?");
    params.push(options.groupId);
  }

  if (excludeMyself) {
    conditions.push("p.myself = 0");
  }

  if (query) {
    conditions.push("(p.first_name LIKE ? OR p.last_name LIKE ? OR p.middle_name LIKE ?)");
    const like = `%${query}%`;
    params.push(like, like, like);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return { fromClause, params, whereClause };
}

/**
 * List rows omit notes columns. Map them to null so a lean SQLite row is still a valid Contact.
 */
export function listContactNotesFields(row: {
  notes?: string | null;
  notes_updated_at?: string | null;
}): { notes: string | null; notesUpdatedAt: string | null } {
  return {
    notes: row.notes ?? null,
    notesUpdatedAt: row.notes_updated_at ?? null,
  };
}

function buildLimitClause(options: Pick<ContactsListParams, "limit" | "offset">): {
  sql: string;
  params: number[];
} {
  if (options.limit === undefined) {
    return { params: [], sql: "" };
  }

  return {
    params: [options.limit, options.offset ?? 0],
    sql: "LIMIT ? OFFSET ?",
  };
}

function assembleSelectSql(selectClause: string, options: ContactsListParams): ContactsListSql {
  const { fromClause, params, whereClause } = buildContactsListQuery(options);
  const limit = buildLimitClause(options);
  const parts = [selectClause, fromClause, whereClause, CONTACTS_LIST_ORDER_BY, limit.sql].filter(
    (part) => part.length > 0,
  );

  return {
    params: [...params, ...limit.params],
    sql: parts.join(" "),
  };
}

/** Full list SELECT (lean columns + FROM/WHERE + optional LIMIT). */
export function buildContactsListSelectSql(options: ContactsListParams): ContactsListSql {
  return assembleSelectSql(`SELECT DISTINCT ${CONTACTS_LIST_COLUMNS}`, options);
}

/** Id-only SELECT using the same FROM/WHERE/ORDER BY/LIMIT as the list query. */
export function buildContactIdsSelectSql(options: ContactsListParams): ContactsListSql {
  return assembleSelectSql("SELECT DISTINCT p.id", options);
}

/** Name fields for a known id list. Null when there are no ids to query. */
export function buildContactNamesByIdsSelectSql(
  personIds: readonly string[],
): ContactsListSql | null {
  const params: string[] = [];
  const seen = new Set<string>();

  for (const personId of personIds) {
    if (!personId || seen.has(personId)) {
      continue;
    }
    seen.add(personId);
    params.push(personId);
  }

  if (params.length === 0) {
    return null;
  }

  const placeholders = params.map(() => "?").join(", ");
  return {
    params,
    sql: `SELECT id, first_name, middle_name, last_name FROM people WHERE id IN (${placeholders})`,
  };
}
