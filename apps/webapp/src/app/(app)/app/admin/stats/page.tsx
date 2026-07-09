import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { StatsLoader } from "./StatsLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("StatsPage");
  return staticPageTitle(t("Title"));
}

export default function StatsPage() {
  return <StatsLoader />;
}
