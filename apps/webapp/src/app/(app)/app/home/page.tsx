import type { Metadata } from "next";
import { getHomePageTranslations } from "@/lib/i18n/generated/hooks.server";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { HomeLoader } from "./HomeLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getHomePageTranslations();
  return staticPageTitle(t("Title"));
}

export default function HomePage() {
  return <HomeLoader />;
}
