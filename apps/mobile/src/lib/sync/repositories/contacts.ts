import type { Contact, Group, ImportantDate, Tag } from "@bondery/schemas";
import {
  buildContactsListQuery,
  type ContactChildRows,
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

export function listContacts(options: {
  query?: string;
  limit: number;
  offset: number;
  excludeMyself?: boolean;
  groupId?: string;
}): { contacts: Contact[]; totalCount: number } {
  const db = getSyncDatabase();
  const { fromClause, whereClause, params } = buildContactsListQuery(options);

  const countRow = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(DISTINCT p.id) as count ${fromClause} ${whereClause}`,
    ...params,
  );

  const rows = db.getAllSync<PeopleRow>(
    `SELECT DISTINCT p.* ${fromClause} ${whereClause}
     ORDER BY p.first_name ASC, p.last_name ASC
     LIMIT ? OFFSET ?`,
    ...params,
    options.limit,
    options.offset,
  );

  return {
    contacts: rows.map((row) => mapPeopleRowToContact(row, false)),
    totalCount: countRow?.count ?? 0,
  };
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
  return getContact(personId)?.importantDates ?? [];
}
