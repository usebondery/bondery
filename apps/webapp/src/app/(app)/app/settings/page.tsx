import type { Metadata } from "next";
import { getSettingsPageTranslations } from "@/lib/i18n/generated/hooks.server";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { SettingsLoader } from "./SettingsLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getSettingsPageTranslations();
  return staticPageTitle(t("Title"));
}

export default function SettingsPage() {
  return <SettingsLoader />;
}
