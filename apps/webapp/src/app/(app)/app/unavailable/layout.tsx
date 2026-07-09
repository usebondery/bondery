import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { preloadWebNamespaces } from "@/lib/i18n/preloadNamespaces.server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("UnavailablePage");
  return { title: t("MetadataTitle") };
}

export default async function UnavailableLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await resolveLocaleSettings();
  await preloadWebNamespaces(locale, ["web.unavailable"]);
  return children;
}
