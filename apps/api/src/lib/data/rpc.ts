import type { PrismaClient } from "@bondery/db";
import { prisma } from "@bondery/db";

type RpcClient = PrismaClient;

export async function rpcGetContactExtras(
  db: RpcClient,
  userId: string,
  personIds: string[],
): Promise<Record<string, unknown>> {
  if (personIds.length === 0) {
    return {};
  }
  const rows = await db.$queryRaw<{ extras: Record<string, unknown> }[]>`
    SELECT get_contact_extras(${userId}::uuid, ${personIds}::uuid[]) AS extras
  `;
  return rows[0]?.extras ?? {};
}

export async function rpcSetPersonLocation(
  db: RpcClient,
  userId: string,
  personId: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  await db.$queryRaw`
    SELECT set_person_location(${userId}::uuid, ${personId}::uuid, ${latitude}::double precision, ${longitude}::double precision)
  `;
}

export type MapPin = {
  id: string;
  latitude: number;
  longitude: number;
};

export async function rpcGetMapPinsInBbox(
  db: RpcClient,
  userId: string,
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
): Promise<MapPin[]> {
  return db.$queryRaw<MapPin[]>`
    SELECT id, latitude, longitude FROM get_map_pins_in_bbox(
      ${userId}::uuid, ${minLat}, ${minLng}, ${maxLat}, ${maxLng}
    )
  `;
}

export async function rpcGetMapAddressPinsInBbox(
  db: RpcClient,
  userId: string,
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
): Promise<MapPin[]> {
  return db.$queryRaw<MapPin[]>`
    SELECT id, latitude, longitude FROM get_map_address_pins_in_bbox(
      ${userId}::uuid, ${minLat}, ${minLng}, ${maxLat}, ${maxLng}
    )
  `;
}

export async function rpcGetKeepInTouchOverdueCount(
  db: RpcClient,
  userId: string,
): Promise<number> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    SELECT get_keep_in_touch_overdue_count(${userId}::uuid) AS count
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function rpcGetLinkedinEnrichEligibleCount(
  db: RpcClient,
  userId: string,
): Promise<number> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    SELECT get_linkedin_enrich_eligible_count(${userId}::uuid) AS count
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function rpcGetLinkedinEnrichEligible(
  db: RpcClient,
  userId: string,
  limit = 25,
): Promise<string[]> {
  const rows = await db.$queryRaw<{ person_id: string }[]>`
    SELECT person_id FROM get_linkedin_enrich_eligible(${userId}::uuid, ${limit}::int)
  `;
  return rows.map((row) => row.person_id);
}

export async function rpcReplaceWorkHistory(
  db: RpcClient,
  userId: string,
  peopleLinkedinId: string,
  rows: unknown,
): Promise<void> {
  await db.$executeRaw`
    SELECT replace_work_history(${userId}::uuid, ${peopleLinkedinId}::uuid, ${JSON.stringify(rows)}::jsonb)
  `;
}

export async function rpcReplaceEducationHistory(
  db: RpcClient,
  userId: string,
  peopleLinkedinId: string,
  rows: unknown,
): Promise<void> {
  await db.$executeRaw`
    SELECT replace_education_history(${userId}::uuid, ${peopleLinkedinId}::uuid, ${JSON.stringify(rows)}::jsonb)
  `;
}

function toIsoTimestamp(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

export async function rpcCheckAndIncrementAiMessages(
  db: RpcClient,
  userId: string,
  limit: number,
  isPremium: boolean,
): Promise<{ allowed: boolean; messagesUsed: number; resetAt: string | null }> {
  const rows = await db.$queryRaw<
    { allowed: boolean; messages_used: number; reset_at: Date | string | null }[]
  >`
    SELECT allowed, messages_used, reset_at
    FROM check_and_increment_ai_messages(${userId}::uuid, ${limit}::int, ${isPremium}::boolean)
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("check_and_increment_ai_messages returned no row");
  }
  return {
    allowed: row.allowed,
    messagesUsed: Number(row.messages_used),
    resetAt: toIsoTimestamp(row.reset_at),
  };
}

/** Default Prisma client for RPC helpers. */
export const rpcDb: PrismaClient = prisma;
