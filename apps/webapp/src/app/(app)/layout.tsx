import { LocaleProvider } from "@/app/(app)/app/components/UserLocaleProvider";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";
import { ModalsProvider } from "@mantine/modals";

/**
 * Force dynamic rendering because resolveLocaleSettings() reads request headers
 * (Accept-Language) and cookies (Supabase session) on every request.
 */
export const dynamic = "force-dynamic";

/**
 * Shared layout for the (app) route group.
 *
 * Provides a single LocaleProvider for all routes — authenticated and unauthenticated.
 * resolveLocaleSettings() automatically uses user preferences when a session exists,
 * and falls back to browser locale detection when it does not.
 *
 * Provider order is intentional:
 *   LocaleProvider > ModalsProvider > children
 *
 * ModalsProvider must be BELOW LocaleProvider so that modal bodies can consume
 * locale context (useTranslations, DatesProvider). The authenticated /app layout
 * no longer needs its own LocaleProvider.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { locale, timezone, timeFormat, messages } = await resolveLocaleSettings();

  return (
    <LocaleProvider locale={locale} timezone={timezone} timeFormat={timeFormat} messages={messages}>
      <ModalsProvider modalProps={{ centered: true }}>{children}</ModalsProvider>
    </LocaleProvider>
  );
}
