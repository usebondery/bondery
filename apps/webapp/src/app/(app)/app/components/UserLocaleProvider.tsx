import { NextIntlClientProvider } from "next-intl";
import { DatesProvider } from "@mantine/dates";
import type { ReactNode } from "react";

interface LocaleProviderProps {
  children: ReactNode;
  locale: string;
  timezone: string;
  timeFormat: "24h" | "12h";
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
export function LocaleProvider({
  children,
  locale,
  timezone,
  timeFormat,
  messages,
}: LocaleProviderProps) {
  const localeWithHourCycle = timeFormat === "12h" ? `${locale}-u-hc-h12` : `${locale}-u-hc-h23`;

  return (
    <NextIntlClientProvider locale={localeWithHourCycle} timeZone={timezone} messages={messages}>
      <DatesProvider settings={{ locale }}>{children}</DatesProvider>
    </NextIntlClientProvider>
  );
}
