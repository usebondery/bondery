import type { Contact, Group, ImportantDate, Tag } from "@bondery/schemas";
import {
  buildContactIdsSelectSql,
  buildContactNamesByIdsSelectSql,
  buildContactsListQuery,
  buildContactsListSelectSql,
  type ContactChildRows,
  type ContactsListParams,
  mapPeopleRowToContact,
  mapSocialRowsToRecord,
  type PeopleRow,
} from "../../resources/contacts";
import { GROUPS_FOR_CONTACT_SQL, mapGroupRow } from "../../resources/groups";
import { mapTagRow, TAGS_FOR_CONTACT_SQL } from "../../resources/tags";
import { getSyncDatabase } from "../db";

function loadContactChildren(personId: string): ContactChildRows {
  const db = getSyncDatabase();
  const socialRows = db.getAllSync<{ platform: string; handle: string }>(
    "SELECT platform, handle FROM people_socials WHERE person_id = ?",
    personId,
  );

  return {
    addresses: db.getAllSync<ContactChildRows["addresses"][number]>(
      "SELECT * FROM people_addresses WHERE person_id = ? ORDER BY sort_order",
      personId,
    ),
    emails: db.getAllSync<{ value: string; type: string; preferred: number }>(
      "SELECT value, type, preferred FROM people_emails WHERE person_id = ? ORDER BY sort_order",
      personId,
    ),
    importantDates: db.getAllSync<ContactChildRows["importantDates"][number]>(
      "SELECT id, person_id, user_id, type, date, note, notify_days_before, notify_on, created_at, updated_at FROM people_important_dates WHERE person_id = ?",
      personId,
    ),
    phones: db.getAllSync<{ prefix: string; value: string; type: string; preferred: number }>(
      "SELECT prefix, value, type, preferred FROM people_phones WHERE person_id = ? ORDER BY sort_order",
      personId,
    ),
    socials: mapSocialRowsToRecord(socialRows),
  };
}

export function listContacts(options: ContactsListParams): {
  contacts: Contact[];
  totalCount: number;
} {
  const db = getSyncDatabase();
  const { fromClause, whereClause, params } = buildContactsListQuery(options);
  const listSql = buildContactsListSelectSql(options);

  const countRow = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(DISTINCT p.id) as count ${fromClause} ${whereClause}`,
    ...params,
  );

  const rows = db.getAllSync<PeopleRow>(listSql.sql, ...listSql.params);

  return {
    contacts: rows.map((row) =>
      mapPeopleRowToContact({ ...row, notes: null, notes_updated_at: null }, false),
    ),
    totalCount: countRow?.count ?? 0,
  };
}

export function listContactIds(options: ContactsListParams): string[] {
  const db = getSyncDatabase();
  const { params, sql } = buildContactIdsSelectSql(options);
  const rows = db.getAllSync<{ id: string }>(sql, ...params);
  return rows.map((row) => row.id);
}

export function getContact(personId: string): Contact | null {
  const db = getSyncDatabase();
  const row = db.getFirstSync<PeopleRow>("SELECT * FROM people WHERE id = ?", personId);
  if (!row) {
    return null;
  }
  const children = loadContactChildren(personId);
  return mapPeopleRowToContact(row, true, children);
}

export function getMyselfContact(): Contact | null {
  const db = getSyncDatabase();
  const row = db.getFirstSync<PeopleRow>("SELECT * FROM people WHERE myself = 1 LIMIT 1");
  if (!row) {
    return null;
  }
  const children = loadContactChildren(row.id);
  return mapPeopleRowToContact(row, true, children);
}

export function getMyselfContactId(): string | null {
  const db = getSyncDatabase();
  const row = db.getFirstSync<{ id: string }>("SELECT id FROM people WHERE myself = 1 LIMIT 1");
  return row?.id ?? null;
}

export function listContactNameRowsByIds(personIds: string[]): Array<{
  firstName: string;
  id: string;
  lastName: string | null;
  middleName: string | null;
}> {
  const query = buildContactNamesByIdsSelectSql(personIds);
  if (!query) {
    return [];
  }

  const db = getSyncDatabase();
  const rows = db.getAllSync<{
    first_name: string;
    id: string;
    last_name: string | null;
    middle_name: string | null;
  }>(query.sql, ...query.params);

  return rows.map((row) => ({
    firstName: row.first_name,
    id: row.id,
    lastName: row.last_name,
    middleName: row.middle_name,
  }));
}

export function countContacts(): number {
  const db = getSyncDatabase();
  const row = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM people WHERE myself = 0",
  );
  return row?.count ?? 0;
}

export const listLocalContacts = listContacts;
export const getLocalContact = getContact;
export const getLocalMyselfContactId = getMyselfContactId;

export function listContactGroups(personId: string): Group[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<Parameters<typeof mapGroupRow>[0]>(GROUPS_FOR_CONTACT_SQL, personId);
  return rows.map(mapGroupRow);
}

export function listContactTags(personId: string): Tag[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<Parameters<typeof mapTagRow>[0]>(TAGS_FOR_CONTACT_SQL, personId);
  return rows.map(mapTagRow);
}

export function listContactImportantDates(personId: string): ImportantDate[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<ContactChildRows["importantDates"][number]>(
    "SELECT id, person_id, user_id, type, date, note, notify_days_before, notify_on, created_at, updated_at FROM people_important_dates WHERE person_id = ?",
    personId,
  );

  return rows.map((row) => ({
    createdAt: row.created_at,
    date: row.date,
    id: row.id,
    note: row.note,
    notifyDaysBefore: row.notify_days_before as ImportantDate["notifyDaysBefore"],
    notifyOn: row.notify_on,
    personId: row.person_id,
    type: row.type as ImportantDate["type"],
    updatedAt: row.updated_at,
    userId: row.user_id,
  }));
}
