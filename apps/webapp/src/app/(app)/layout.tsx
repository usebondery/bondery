import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { CodeHighlightProvider } from "@bondery/mantine-next";
import { ModalsProvider } from "@mantine/modals";
import { headers } from "next/headers";
import { getT, initServerI18next } from "next-i18next/server";
import { LocaleProvider } from "@/components/shell/UserLocaleProvider";
import i18nConfig from "@/i18n.config";
import { getRouteResources } from "@/lib/i18n/getRouteResources.server";
import { preloadAllWebNamespaces, preloadWebNamespaces } from "@/lib/i18n/preloadNamespaces.server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";
import { QueryProvider } from "@/lib/query/QueryProvider";

initServerI18next(i18nConfig);

/**
 * Force dynamic rendering because resolveLocaleSettings() reads request headers
 * (Accept-Language) and cookies (webapp session) on every request.
 */
export const dynamic = "force-dynamic";

/**
 * Shared layout for the (app) route group.
 *
 * Product routes (`/app/*`) mount the only `LocaleProvider` of the shell. Their
 * nested layouts preload namespaces for server rendering but mount no provider,
 * so this provider must ship every web namespace.
 *
 * Login, confirm, and OAuth routes mount their own `PreloadedLocaleProvider`
 * with a route group. They need the shell strings only.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, timezone, timeFormat, dateFormat }, headersList] = await Promise.all([
    resolveLocaleSettings(),
    headers(),
  ]);
  const pathname = headersList.get("x-pathname") ?? "";
  const namespaces = pathname.startsWith(WEBAPP_ROUTES.APP_GROUP)
    ? await preloadAllWebNamespaces(locale)
    : await preloadWebNamespaces(locale, ["web.shell"]);
  const { i18n } = await getT("common", { lng: locale });
  const resources = getRouteResources(i18n, locale, namespaces);

  return (
    <LocaleProvider
      dateFormat={dateFormat}
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
