import type { PrismaClient } from "@bondery/db";
import { getCountryCodeForTimezone, resolveDefaultPhoneCountry } from "@bondery/helpers/phone";

export async function loadDefaultPhoneCountryForUser(
  db: PrismaClient,
  userId: string,
): Promise<string | null> {
  const settings = await db.userSettings.findUnique({
    select: { defaultPhoneCountry: true, timezone: true },
    where: { userId },
  });

  if (!settings) {
    return null;
  }

  return resolveDefaultPhoneCountry({
    defaultPhoneCountry: settings.defaultPhoneCountry,
    timezone: settings.timezone,
  });
}

export function deriveDefaultPhoneCountryFromTimezone(timezone: string): string | null {
  return getCountryCodeForTimezone(timezone);
}
