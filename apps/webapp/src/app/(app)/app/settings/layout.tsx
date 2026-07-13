import { preloadWebNamespaces } from "@/lib/i18n/preloadNamespaces.server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";

const PRELOAD_GROUPS = ["web.settings"] as const;

export default async function SettingsRouteLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await resolveLocaleSettings();
  await preloadWebNamespaces(locale, [...PRELOAD_GROUPS]);
  return children;
}
