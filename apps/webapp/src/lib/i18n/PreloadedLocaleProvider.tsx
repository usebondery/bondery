import { getResources, getT } from "next-i18next/server";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/shell/UserLocaleProvider";
import { preloadWebNamespaces } from "@/lib/i18n/preloadNamespaces.server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";

/**
 * Route-level i18n bag. Parent `(app)/layout` snapshots `web.shell` before nested
 * layouts run, so a preload-only layout still loses the race and client hooks
 * render keys. Snapshot again after this route's groups and wrap a nested provider.
 */
export async function PreloadedLocaleProvider({
  children,
  groups,
}: {
  children: ReactNode;
  groups: string[];
}) {
  const { locale, timezone, timeFormat } = await resolveLocaleSettings();
  await preloadWebNamespaces(locale, groups);
  const { i18n } = await getT("common", { lng: locale });

  return (
    <LocaleProvider
      locale={locale}
      resources={getResources(i18n)}
      timeFormat={timeFormat}
      timezone={timezone}
    >
      {children}
    </LocaleProvider>
  );
}
