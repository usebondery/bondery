import type {
  Contact,
  ContactAddressEntry,
  EmailEntry,
  Group,
  ImportantDate,
  PhoneEntry,
  Tag,
} from "@bondery/schemas";
import { getSyncDatabase } from "../db";
import { parseGisPointLatLon } from "../materializer/read-row";
import { resolveAvatarUrlFromBase, resolveLocalContactAvatarUrl } from "../avatar";

type PeopleRow = {
  id: string;
  user_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  headline: string | null;
  location: string | null;
  notes: string | null;
  last_interaction: string | null;
  keep_frequency_days: number | null;
  myself: number;
  language: string | null;
  timezone: string | null;
  gis_point: string | null;
  has_avatar: number;
  notes_updated_at: string | null;
  last_interaction_activity_id: string | null;
  created_at: string;
  updated_at: string;
};

function loadSocials(personId: string): Record<string, string | null> {
  const db = getSyncDatabase();
  const rows = db.getAllSync<{ platform: string; handle: string }>(
    "SELECT platform, handle FROM people_socials WHERE person_id = ?",
    personId,
  );
  const map: Record<string, string | null> = {
    linkedin: null,
    instagram: null,
    whatsapp: null,
    facebook: null,
    website: null,
    signal: null,
  };
  for (const row of rows) {
    if (row.platform in map) {
      map[row.platform] = row.handle;
    }
  }
  return map;
}

function mapPeopleRowToContact(row: PeopleRow, includeChildren: boolean): Contact {
  const { latitude, longitude } = parseGisPointLatLon(row.gis_point);
  const hasAvatar = row.has_avatar === 1;
  const avatar =
    resolveLocalContactAvatarUrl(row.user_id, row.id, hasAvatar, row.updated_at) ??
    resolveAvatarUrlFromBase(row.user_id, row.id, hasAvatar, row.updated_at);

  const socials = loadSocials(row.id);
  const db = getSyncDatabase();

  const phones = includeChildren
    ? db
        .getAllSync<{ prefix: string; value: string; type: string; preferred: number }>(
          "SELECT prefix, value, type, preferred FROM people_phones WHERE person_id = ? ORDER BY sort_order",
          row.id,
        )
        .map(
          (p): PhoneEntry => ({
            prefix: p.prefix,
            value: p.value,
            type: p.type as PhoneEntry["type"],
            preferred: p.preferred === 1,
          }),
        )
    : null;

  const emails = includeChildren
    ? db
        .getAllSync<{ value: string; type: string; preferred: number }>(
          "SELECT value, type, preferred FROM people_emails WHERE person_id = ? ORDER BY sort_order",
          row.id,
        )
        .map(
          (e): EmailEntry => ({
            value: e.value,
            type: e.type as EmailEntry["type"],
            preferred: e.preferred === 1,
          }),
        )
    : null;

  const addresses = includeChildren
    ? db
        .getAllSync<{
          type: string;
          label: string | null;
          value: string;
          latitude: number | null;
          longitude: number | null;
          address_line1: string | null;
          address_line2: string | null;
          address_city: string | null;
          address_state: string | null;
          address_state_code: string | null;
          address_postal_code: string | null;
          address_country: string | null;
          address_country_code: string | null;
          address_formatted: string | null;
          address_granularity: string;
          address_geocode_source: string | null;
          geocode_confidence: string | null;
          timezone: string | null;
        }>("SELECT * FROM people_addresses WHERE person_id = ? ORDER BY sort_order", row.id)
        .map(
          (a): ContactAddressEntry => ({
            type: a.type as ContactAddressEntry["type"],
            label: a.label,
            value: a.value,
            latitude: a.latitude,
            longitude: a.longitude,
            addressLine1: a.address_line1,
            addressLine2: a.address_line2,
            addressCity: a.address_city,
            addressState: a.address_state,
            addressStateCode: a.address_state_code,
            addressPostalCode: a.address_postal_code,
            addressCountry: a.address_country,
            addressCountryCode: a.address_country_code,
            addressFormatted: a.address_formatted,
            addressGranularity: a.address_granularity as ContactAddressEntry["addressGranularity"],
            addressGeocodeSource:
              a.address_geocode_source as ContactAddressEntry["addressGeocodeSource"],
            geocodeConfidence: a.geocode_confidence as ContactAddressEntry["geocodeConfidence"],
            timezone: a.timezone,
          }),
        )
    : null;

  const importantDates = includeChildren
    ? db
        .getAllSync<{
          id: string;
          person_id: string;
          user_id: string;
          type: string;
          date: string;
          note: string | null;
          notify_days_before: number | null;
          notify_on: string | null;
          created_at: string;
          updated_at: string;
        }>(
          "SELECT id, person_id, user_id, type, date, note, notify_days_before, notify_on, created_at, updated_at FROM people_important_dates WHERE person_id = ?",
          row.id,
        )
        .map(
          (d): ImportantDate => ({
            id: d.id,
            userId: d.user_id,
            personId: d.person_id,
            type: d.type as ImportantDate["type"],
            date: d.date,
            note: d.note,
            notifyDaysBefore: d.notify_days_before as ImportantDate["notifyDaysBefore"],
            notifyOn: d.notify_on,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }),
        )
    : null;

  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    headline: row.headline,
    location: row.location,
    notes: row.notes,
    notesUpdatedAt: row.notes_updated_at,
    avatar,
    lastInteraction: row.last_interaction,
    lastInteractionActivityId: row.last_interaction_activity_id,
    keepFrequencyDays: row.keep_frequency_days,
    myself: row.myself === 1,
    language: row.language,
    timezone: row.timezone,
    gisPoint: row.gis_point,
    latitude,
    longitude,
    linkedin: socials.linkedin ?? null,
    instagram: socials.instagram ?? null,
    whatsapp: socials.whatsapp ?? null,
    facebook: socials.facebook ?? null,
    website: socials.website ?? null,
    signal: socials.signal ?? null,
    phones,
    emails,
    addresses,
    importantDates,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  return row ? mapPeopleRowToContact(row, true) : null;
}

export function getMyselfContact(): Contact | null {
  const db = getSyncDatabase();
  const row = db.getFirstSync<PeopleRow>("SELECT * FROM people WHERE myself = 1 LIMIT 1");
  return row ? mapPeopleRowToContact(row, true) : null;
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
  const rows = db.getAllSync<{
    id: string;
    user_id: string;
    label: string;
    emoji: string | null;
    color: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>(
    `SELECT g.* FROM groups g
     INNER JOIN people_groups pg ON pg.group_id = g.id
     WHERE pg.person_id = ?
     ORDER BY g.label ASC`,
    personId,
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    label: row.label,
    emoji: row.emoji ?? "👥",
    color: row.color ?? "#868e96",
    createdAt: row.created_at ?? new Date(0).toISOString(),
    updatedAt: row.updated_at ?? new Date(0).toISOString(),
  }));
}

export function listContactTags(personId: string): Tag[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<{
    id: string;
    user_id: string;
    label: string;
    color: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>(
    `SELECT t.* FROM tags t
     INNER JOIN people_tags pt ON pt.tag_id = t.id
     WHERE pt.person_id = ?
     ORDER BY t.label ASC`,
    personId,
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    label: row.label,
    color: row.color,
    createdAt: row.created_at ?? new Date(0).toISOString(),
    updatedAt: row.updated_at ?? new Date(0).toISOString(),
  }));
}

export function listContactImportantDates(personId: string): ImportantDate[] {
  return getContact(personId)?.importantDates ?? [];
}
