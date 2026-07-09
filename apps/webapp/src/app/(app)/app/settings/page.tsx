import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { SettingsLoader } from "./SettingsLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SettingsPage");
  return staticPageTitle(t("Title"));
}

export default function SettingsPage() {
  return <SettingsLoader />;
}
