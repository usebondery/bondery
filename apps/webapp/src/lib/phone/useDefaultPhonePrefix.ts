"use client";

import { countryToCallingCode, resolveDefaultPhoneCountry } from "@bondery/helpers/phone";
import { useSettingsQuery } from "@/lib/query/hooks/useSettings";

/**
 * Dial prefix (`+420`, `+1`, …) from user default phone country settings.
 */
export function useDefaultPhoneCountry(): string | null {
  const { data: settingsResult } = useSettingsQuery();

  const settings = settingsResult?.data;
  if (!settings) {
    return null;
  }

  const defaultPhoneCountry =
    typeof settings.defaultPhoneCountry === "string" ? settings.defaultPhoneCountry : null;
  const timezone = typeof settings.timezone === "string" ? settings.timezone : null;

  return resolveDefaultPhoneCountry({
    defaultPhoneCountry,
    timezone,
  });
}

export function useDefaultPhonePrefix(): string {
  const country = useDefaultPhoneCountry();
  return countryToCallingCode(country ?? "") ?? "+1";
}
