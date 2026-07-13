"use client";

import {
  i18nConfig,
  resourceLoader,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@bondery/translations";
import { DatesProvider } from "@mantine/dates";
import type { Resource } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { I18nProvider } from "next-i18next/client";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

export interface UserLocaleSettings {
  applyUserLocale: (
    patch: Partial<Pick<UserLocaleSettings, "locale" | "timezone" | "timeFormat">>,
  ) => void;
  locale: SupportedLocale;
  timeFormat: "24h" | "12h";
  timezone: string;
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
  resources: Resource;
  timeFormat: "24h" | "12h";
  timezone: string;
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
      if (patch.locale) {
        setLocale(patch.locale);
      }
      if (patch.timezone) {
        setTimezone(patch.timezone);
      }
      if (patch.timeFormat) {
        setTimeFormat(patch.timeFormat);
      }
    },
    [],
  );

  return (
    <UserLocaleContext.Provider value={{ applyUserLocale, locale, timeFormat, timezone }}>
      <I18nProvider
        defaultNS={i18nConfig.defaultNS}
        fallbackLng={i18nConfig.fallbackLng}
        i18nextOptions={{
          interpolation: i18nConfig.interpolation,
          keySeparator: i18nConfig.keySeparator,
          nsSeparator: i18nConfig.nsSeparator,
          partialBundledLanguages: true,
        }}
        language={locale}
        resources={resources}
        supportedLngs={[...SUPPORTED_LOCALES]}
        use={[resourcesToBackend(resourceLoader)]}
      >
        <DatesProvider settings={{ locale }}>{children}</DatesProvider>
      </I18nProvider>
    </UserLocaleContext.Provider>
  );
}
