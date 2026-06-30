"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { I18nProvider } from "next-i18next/client";
import { DatesProvider } from "@mantine/dates";
import type { Resource } from "i18next";
import { i18nConfig, SUPPORTED_LOCALES, type SupportedLocale } from "@bondery/translations";

export interface UserLocaleSettings {
  locale: SupportedLocale;
  timezone: string;
  timeFormat: "24h" | "12h";
  applyUserLocale: (patch: Partial<Pick<UserLocaleSettings, "locale" | "timezone" | "timeFormat">>) => void;
}

const UserLocaleContext = createContext<UserLocaleSettings | null>(null);

export function useUserLocale(): UserLocaleSettings {
  const context = useContext(UserLocaleContext);
  if (!context) {
    throw new Error("useUserLocale must be used within LocaleProvider");
  }
  return context;
}

/** Convenience accessor for components that only need the language code. */
export function useCurrentLocale(): SupportedLocale {
  return useUserLocale().locale;
}

interface LocaleProviderProps {
  children: ReactNode;
  locale: SupportedLocale;
  timezone: string;
  timeFormat: "24h" | "12h";
  resources: Resource;
}

/**
 * Provides i18n translations (next-i18next) and user locale preferences
 * (timezone, time format) for all routes under the (app) group.
 */
export function LocaleProvider({
  children,
  locale: initialLocale,
  timezone: initialTimezone,
  timeFormat: initialTimeFormat,
  resources,
}: LocaleProviderProps) {
  const [locale, setLocale] = useState(initialLocale);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [timeFormat, setTimeFormat] = useState<"24h" | "12h">(initialTimeFormat);

  useEffect(() => {
    setLocale(initialLocale);
    setTimezone(initialTimezone);
    setTimeFormat(initialTimeFormat);
  }, [initialLocale, initialTimezone, initialTimeFormat]);

  const applyUserLocale = useCallback(
    (patch: Partial<Pick<UserLocaleSettings, "locale" | "timezone" | "timeFormat">>) => {
      if (patch.locale) setLocale(patch.locale);
      if (patch.timezone) setTimezone(patch.timezone);
      if (patch.timeFormat) setTimeFormat(patch.timeFormat);
    },
    [],
  );

  return (
    <UserLocaleContext.Provider value={{ locale, timezone, timeFormat, applyUserLocale }}>
      <I18nProvider
        language={locale}
        resources={resources}
        defaultNS={i18nConfig.defaultNS}
        fallbackLng={i18nConfig.fallbackLng}
        supportedLngs={[...SUPPORTED_LOCALES]}
        i18nextOptions={{
          keySeparator: i18nConfig.keySeparator,
          nsSeparator: i18nConfig.nsSeparator,
          interpolation: i18nConfig.interpolation,
        }}
      >
        <DatesProvider settings={{ locale }}>{children}</DatesProvider>
      </I18nProvider>
    </UserLocaleContext.Provider>
  );
}
