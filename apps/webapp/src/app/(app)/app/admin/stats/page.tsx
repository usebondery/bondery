import type { Metadata } from "next";
import { getStatsPageTranslations } from "@/lib/i18n/generated/hooks.server";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { StatsLoader } from "./StatsLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getStatsPageTranslations();
  return staticPageTitle(t("Title"));
}

export default function StatsPage() {
  return <StatsLoader />;
}
