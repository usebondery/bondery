import { ModalsProvider } from "@mantine/modals";
import { getResources, getT, initServerI18next } from "next-i18next/server";
import { CodeHighlightProvider } from "@/components/CodeHighlightProvider";
import { LocaleProvider } from "@/components/shell/UserLocaleProvider";
import i18nConfig from "@/i18n.config";
import { preloadWebNamespaces } from "@/lib/i18n/preloadNamespaces.server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";
import { QueryProvider } from "@/lib/query/QueryProvider";

initServerI18next(i18nConfig);

/**
 * Force dynamic rendering because resolveLocaleSettings() reads request headers
 * (Accept-Language) and cookies (Supabase session) on every request.
 */
export const dynamic = "force-dynamic";

/**
 * Shared layout for the (app) route group.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { locale, timezone, timeFormat } = await resolveLocaleSettings();
  await preloadWebNamespaces(locale, ["web.shell"]);
  const { i18n } = await getT("common", { lng: locale });
  const resources = getResources(i18n);

  return (
    <LocaleProvider
      locale={locale}
      resources={resources}
      timeFormat={timeFormat}
      timezone={timezone}
    >
      <QueryProvider>
        <CodeHighlightProvider>
          <ModalsProvider modalProps={{ centered: true }}>{children}</ModalsProvider>
        </CodeHighlightProvider>
      </QueryProvider>
    </LocaleProvider>
  );
}
