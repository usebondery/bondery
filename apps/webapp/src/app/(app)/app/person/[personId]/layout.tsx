import { preloadWebNamespaces } from "@/lib/i18n/preloadNamespaces.server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";

export default async function PersonRouteLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await resolveLocaleSettings();
  await preloadWebNamespaces(locale, ["web.person"]);
  return children;
}
