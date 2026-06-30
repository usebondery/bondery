import { LocaleProvider } from "@/app/(app)/app/components/UserLocaleProvider";
import { CodeHighlightProvider } from "@/components/CodeHighlightProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";
import { ModalsProvider } from "@mantine/modals";
import { getResources, getT, initServerI18next } from "next-i18next/server";
import i18nConfig from "@/i18n.config";

initServerI18next(i18nConfig);

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
 *   LocaleProvider > CodeHighlightProvider > ModalsProvider > children
 *
 * ModalsProvider must be BELOW LocaleProvider so that modal bodies can consume
 * locale context (useT, DatesProvider). CodeHighlightProvider must wrap
 * ModalsProvider so modal content can access the highlight.js adapter.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { locale, timezone, timeFormat } = await resolveLocaleSettings();
  const { i18n } = await getT(undefined, { lng: locale });
  const resources = getResources(i18n);

  return (
    <LocaleProvider
      locale={locale}
      timezone={timezone}
      timeFormat={timeFormat}
      resources={resources}
    >
      <QueryProvider>
        <CodeHighlightProvider>
          <ModalsProvider modalProps={{ centered: true }}>{children}</ModalsProvider>
        </CodeHighlightProvider>
      </QueryProvider>
    </LocaleProvider>
  );
}
