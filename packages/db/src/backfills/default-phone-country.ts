import { getCountryCodeForTimezone } from "@bondery/helpers/phone";

import type { PrismaClient } from "../generated/prisma/client.js";

export type BackfillDefaultPhoneCountryResult = {
  scanned: number;
  updated: number;
};

/**
 * Maps a stored timezone to a country code for backfill when `default_phone_country` is null.
 * Returns null for UTC, blank, or unmapped zones.
 */
export function resolveBackfillPhoneCountryForTimezone(
  timezone: string | null | undefined,
): string | null {
  const trimmed = timezone?.trim();
  if (!trimmed || trimmed === "UTC") {
    return null;
  }

  return getCountryCodeForTimezone(trimmed);
}

/**
 * Sets `default_phone_country` from `timezone` where the column is still null.
 * Idempotent: never overwrites an existing country.
 */
export async function backfillDefaultPhoneCountry(
  db: PrismaClient,
): Promise<BackfillDefaultPhoneCountryResult> {
  const rows = await db.userSettings.findMany({
    select: { id: true, timezone: true },
    where: { defaultPhoneCountry: null, timezone: { not: null } },
  });

  let updated = 0;

  for (const row of rows) {
    const country = resolveBackfillPhoneCountryForTimezone(row.timezone);
    if (!country) {
      continue;
    }

    await db.userSettings.update({
      data: { defaultPhoneCountry: country },
      where: { id: row.id },
    });
    updated += 1;
  }

  return { scanned: rows.length, updated };
}
