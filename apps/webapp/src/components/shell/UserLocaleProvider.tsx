"use client";

import type { DateFormatPreference } from "@bondery/schemas";
import { coerceDateFormatPreference } from "@bondery/schemas/locale";
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
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import "@/lib/i18n/loadDayjsLocales";

export interface UserLocaleSettings {
  applyUserLocale: (
    patch: Partial<Pick<UserLocaleSettings, "locale" | "timezone" | "timeFormat" | "dateFormat">>,
  ) => void;
  dateFormat: DateFormatPreference;
  locale: SupportedLocale;
  timeFormat: "24h" | "12h";
  timezone: string;
}

const UserLocaleContext = createContext<UserLocaleSettings | null>(null);

/** Module ref so settings mutations can patch locale without hook context. */
let applyUserLocaleRef: UserLocaleSettings["applyUserLocale"] | null = null;

export function applyUserLocaleFromRef(
  patch: Partial<Pick<UserLocaleSettings, "locale" | "timezone" | "timeFormat" | "dateFormat">>,
): void {
  applyUserLocaleRef?.(patch);
}

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
  dateFormat: DateFormatPreference;
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
  dateFormat: initialDateFormat,
  resources,
}: LocaleProviderProps) {
  const [locale, setLocale] = useState(initialLocale);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [timeFormat, setTimeFormat] = useState<"24h" | "12h">(initialTimeFormat);
  const [dateFormat, setDateFormat] = useState<DateFormatPreference>(initialDateFormat);

  useEffect(() => {
    setLocale(initialLocale);
    setTimezone(initialTimezone);
    setTimeFormat(initialTimeFormat);
    setDateFormat(initialDateFormat);
  }, [initialLocale, initialTimezone, initialTimeFormat, initialDateFormat]);

  const applyUserLocale = (
    patch: Partial<Pick<UserLocaleSettings, "locale" | "timezone" | "timeFormat" | "dateFormat">>,
  ) => {
    if (patch.locale) {
      setLocale(patch.locale);
    }
    if (patch.timezone) {
      setTimezone(patch.timezone);
    }
    if (patch.timeFormat) {
      setTimeFormat(patch.timeFormat);
    }
    if (patch.dateFormat) {
      setDateFormat(patch.dateFormat);
    }
  };

  const applyRef = useRef(applyUserLocale);
  applyRef.current = applyUserLocale;

  useEffect(() => {
    applyUserLocaleRef = (patch) => applyRef.current(patch);
    return () => {
      applyUserLocaleRef = null;
    };
  }, []);

  return (
    <UserLocaleContext.Provider
      value={{ applyUserLocale, dateFormat, locale, timeFormat, timezone }}
    >
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
