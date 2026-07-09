import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { preloadWebNamespaces } from "@/lib/i18n/preloadNamespaces.server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Onboarding");
  return { title: t("MetadataTitle") };
}

/**
 * Onboarding layout — the Modal overlay handles positioning.
 * Inherits auth and locale context from the parent app layout.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await resolveLocaleSettings();
  await preloadWebNamespaces(locale, ["web.onboarding"]);
  return <>{children}</>;
}
