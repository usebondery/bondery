import { NextIntlClientProvider } from "next-intl";
import { DatesProvider } from "@mantine/dates";
import type { ReactNode } from "react";

interface LocaleProviderProps {
  children: ReactNode;
  locale: string;
  timezone: string;
  messages: any;
}

/**
 * Server component that provides locale settings via NextIntlClientProvider and DatesProvider.
 * Used to provide i18n context for routes that need translations.
 *
 * @param locale - The language code (e.g., 'en', 'cs')
 * @param timezone - The timezone (e.g., 'Europe/Prague', 'UTC')
 * @param messages - The translation messages for the locale
 */
export function LocaleProvider({ children, locale, timezone, messages }: LocaleProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} timeZone={timezone} messages={messages}>
      <DatesProvider settings={{ locale }}>{children}</DatesProvider>
    </NextIntlClientProvider>
  );
}
