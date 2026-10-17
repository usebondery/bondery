import type { PrismaClient } from "@bondery/db";

export type MapPinRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  headline: string | null;
  has_avatar: boolean;
  latitude: number;
  longitude: number;
  location: string | null;
  last_interaction: Date | string | null;
  avatar_updated_at: Date | string | null;
};

export type MapAddressPinRow = {
  address_id: string;
  person_id: string;
  first_name: string;
  last_name: string | null;
  has_avatar: boolean;
  address_type: string;
  address_city: string | null;
  address_country: string | null;
  address_formatted: string | null;
  latitude: number;
  longitude: number;
  avatar_updated_at: Date | string | null;
};

export type LinkedinEnrichEligibleRow = {
  person_id: string;
  first_name: string;
  last_name: string | null;
  handle: string;
};

/** Batch-load phones, emails, addresses, and socials (JSON shape v1). */
export async function getContactExtrasWithDb(
  db: PrismaClient,
  userId: string,
  personIds: string[],
): Promise<unknown> {
  const rows = await db.$queryRaw<{ result: unknown }[]>`
    SELECT get_contact_extras(${userId}::uuid, ${personIds}::uuid[]) AS result
  `;
  return rows[0]?.result ?? {};
}

export async function setPersonLocationWithDb(
  db: PrismaClient,
  userId: string,
  personId: string,
  latitude: number | null,
  longitude: number | null,
): Promise<void> {
  await db.$executeRaw`
    SELECT set_person_location(
      ${userId}::uuid,
      ${personId}::uuid,
      ${latitude}::double precision,
      ${longitude}::double precision
    )
  `;
}

export async function getMapPinsInBboxWithDb(
  db: PrismaClient,
  userId: string,
  bounds: {
    minLat: number;
    minLon: number;
    maxLat: number;
    maxLon: number;
    limit: number;
  },
): Promise<MapPinRow[]> {
  return db.$queryRaw<MapPinRow[]>`
    SELECT * FROM get_map_pins_in_bbox(
      ${userId}::uuid,
      ${bounds.minLat}::double precision,
      ${bounds.minLon}::double precision,
      ${bounds.maxLat}::double precision,
      ${bounds.maxLon}::double precision,
      ${bounds.limit}::int
    )
  `;
}

export async function getMapAddressPinsInBboxWithDb(
  db: PrismaClient,
  userId: string,
  bounds: {
    minLat: number;
    minLon: number;
    maxLat: number;
    maxLon: number;
    limit: number;
  },
): Promise<MapAddressPinRow[]> {
  return db.$queryRaw<MapAddressPinRow[]>`
    SELECT * FROM get_map_address_pins_in_bbox(
      ${userId}::uuid,
      ${bounds.minLat}::double precision,
      ${bounds.minLon}::double precision,
      ${bounds.maxLat}::double precision,
      ${bounds.maxLon}::double precision,
      ${bounds.limit}::int
    )
  `;
}

export async function replaceWorkHistoryWithDb(
  db: PrismaClient,
  userId: string,
  peopleLinkedinId: string,
  rows: unknown[],
): Promise<void> {
  await db.$executeRaw`
    SELECT replace_work_history(
      ${userId}::uuid,
      ${peopleLinkedinId}::uuid,
      ${JSON.stringify(rows)}::jsonb
    )
  `;
}

export async function replaceEducationHistoryWithDb(
  db: PrismaClient,
  userId: string,
  peopleLinkedinId: string,
  rows: unknown[],
): Promise<void> {
  await db.$executeRaw`
    SELECT replace_education_history(
      ${userId}::uuid,
      ${peopleLinkedinId}::uuid,
      ${JSON.stringify(rows)}::jsonb
    )
  `;
}

export async function getLinkedinEnrichEligibleWithDb(
  db: PrismaClient,
  userId: string,
  limit: number,
): Promise<LinkedinEnrichEligibleRow[]> {
  return db.$queryRaw<LinkedinEnrichEligibleRow[]>`
    SELECT * FROM get_linkedin_enrich_eligible(${userId}::uuid, ${limit}::int)
  `;
}

export async function getLinkedinEnrichEligibleCountWithDb(
  db: PrismaClient,
  userId: string,
): Promise<number> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    SELECT get_linkedin_enrich_eligible_count(${userId}::uuid) AS count
  `;
  const count = rows[0]?.count;
  return typeof count === "number" ? count : Number(count ?? 0);
}
