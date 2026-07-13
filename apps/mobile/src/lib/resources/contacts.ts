import type {
  Contact,
  ContactAddressEntry,
  EmailEntry,
  ImportantDate,
  PhoneEntry,
} from "@bondery/schemas";
import { resolveAvatarUrlFromBase, resolveLocalContactAvatarUrl } from "../sync/avatar";
import { parseGisPointLatLon } from "../sync/materializer/read-row";

export type PeopleRow = {
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

export type ContactsListParams = {
  query?: string;
  limit: number;
  offset: number;
  excludeMyself?: boolean;
  groupId?: string;
};

export type ContactsListQuery = {
  fromClause: string;
  whereClause: string;
  params: (string | number)[];
};

export type ContactChildRows = {
  socials: Record<string, string | null>;
  phones: Array<{ prefix: string; value: string; type: string; preferred: number }>;
  emails: Array<{ value: string; type: string; preferred: number }>;
  addresses: Array<{
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
  }>;
  importantDates: Array<{
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
  }>;
};

const EMPTY_SOCIALS: Record<string, string | null> = {
  facebook: null,
  instagram: null,
  linkedin: null,
  signal: null,
  website: null,
  whatsapp: null,
};

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

export function mapPeopleRowToContact(
  row: PeopleRow,
  includeChildren: boolean,
  children?: ContactChildRows,
): Contact {
  const { latitude, longitude } = parseGisPointLatLon(row.gis_point);
  const hasAvatar = row.has_avatar === 1;
  const avatar =
    resolveLocalContactAvatarUrl(row.user_id, row.id, hasAvatar, row.updated_at) ??
    resolveAvatarUrlFromBase(row.user_id, row.id, hasAvatar, row.updated_at);

  const socials = children?.socials ?? EMPTY_SOCIALS;

  const phones = includeChildren
    ? (children?.phones ?? []).map(
        (p): PhoneEntry => ({
          preferred: p.preferred === 1,
          prefix: p.prefix,
          type: p.type as PhoneEntry["type"],
          value: p.value,
        }),
      )
    : null;

  const emails = includeChildren
    ? (children?.emails ?? []).map(
        (e): EmailEntry => ({
          preferred: e.preferred === 1,
          type: e.type as EmailEntry["type"],
          value: e.value,
        }),
      )
    : null;

  const addresses = includeChildren
    ? (children?.addresses ?? []).map(
        (a): ContactAddressEntry => ({
          addressCity: a.address_city,
          addressCountry: a.address_country,
          addressCountryCode: a.address_country_code,
          addressFormatted: a.address_formatted,
          addressGeocodeSource:
            a.address_geocode_source as ContactAddressEntry["addressGeocodeSource"],
          addressGranularity: a.address_granularity as ContactAddressEntry["addressGranularity"],
          addressLine1: a.address_line1,
          addressLine2: a.address_line2,
          addressPostalCode: a.address_postal_code,
          addressState: a.address_state,
          addressStateCode: a.address_state_code,
          geocodeConfidence: a.geocode_confidence as ContactAddressEntry["geocodeConfidence"],
          label: a.label,
          latitude: a.latitude,
          longitude: a.longitude,
          timezone: a.timezone,
          type: a.type as ContactAddressEntry["type"],
          value: a.value,
        }),
      )
    : null;

  const importantDates = includeChildren
    ? (children?.importantDates ?? []).map(
        (d): ImportantDate => ({
          createdAt: d.created_at,
          date: d.date,
          id: d.id,
          note: d.note,
          notifyDaysBefore: d.notify_days_before as ImportantDate["notifyDaysBefore"],
          notifyOn: d.notify_on,
          personId: d.person_id,
          type: d.type as ImportantDate["type"],
          updatedAt: d.updated_at,
          userId: d.user_id,
        }),
      )
    : null;

  return {
    addresses,
    avatar,
    createdAt: row.created_at,
    emails,
    facebook: socials.facebook ?? null,
    firstName: row.first_name,
    gisPoint: row.gis_point,
    headline: row.headline,
    id: row.id,
    importantDates,
    instagram: socials.instagram ?? null,
    keepFrequencyDays: row.keep_frequency_days,
    language: row.language,
    lastInteraction: row.last_interaction,
    lastInteractionActivityId: row.last_interaction_activity_id,
    lastName: row.last_name,
    latitude,
    linkedin: socials.linkedin ?? null,
    location: row.location,
    longitude,
    middleName: row.middle_name,
    myself: row.myself === 1,
    notes: row.notes,
    notesUpdatedAt: row.notes_updated_at,
    phones,
    signal: socials.signal ?? null,
    timezone: row.timezone,
    updatedAt: row.updated_at,
    userId: row.user_id,
    website: socials.website ?? null,
    whatsapp: socials.whatsapp ?? null,
  };
}

export function mapSocialRowsToRecord(
  rows: Array<{ platform: string; handle: string }>,
): Record<string, string | null> {
  const map: Record<string, string | null> = { ...EMPTY_SOCIALS };
  for (const row of rows) {
    if (row.platform in map) {
      map[row.platform] = row.handle;
    }
  }
  return map;
}
