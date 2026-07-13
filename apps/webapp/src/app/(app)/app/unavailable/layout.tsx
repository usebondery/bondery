import type { Metadata } from "next";
import { getUnavailablePageTranslations } from "@/lib/i18n/generated/hooks.server";
import { preloadWebNamespaces } from "@/lib/i18n/preloadNamespaces.server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getUnavailablePageTranslations();
  return { title: t("MetadataTitle") };
}

export default async function UnavailableLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await resolveLocaleSettings();
  await preloadWebNamespaces(locale, ["web.unavailable"]);
  return children;
}
