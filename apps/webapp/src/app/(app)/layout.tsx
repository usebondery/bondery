import { LocaleProvider } from "@/app/(app)/app/components/UserLocaleProvider";
import { getLocaleFromHeaders } from "@/lib/i18n/getLocaleFromHeaders";
import * as translations from "@bondery/translations";

/**
 * Force dynamic rendering because we use headers() for locale detection
 */
export const dynamic = "force-dynamic";

/**
 * Layout for (app) route group - provides browser-based locale for login
 * and other public routes. The nested /app layout overrides this with
 * user settings for authenticated routes.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocaleFromHeaders();
  const timezone = "UTC";
  const messages = translations[locale as keyof typeof translations] || translations.en;

  return (
    <LocaleProvider locale={locale} timezone={timezone} messages={messages}>
      {children}
    </LocaleProvider>
  );
}
