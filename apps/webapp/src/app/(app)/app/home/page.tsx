import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { HomeLoader } from "./HomeLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("HomePage");
  return staticPageTitle(t("Title"));
}

export default function HomePage() {
  return <HomeLoader />;
}
