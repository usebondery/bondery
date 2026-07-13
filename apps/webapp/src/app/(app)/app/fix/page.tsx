import type { Metadata } from "next";
import { getFixContactsPageTranslations } from "@/lib/i18n/generated/hooks.server";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { FixLoader } from "./FixLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getFixContactsPageTranslations();
  return staticPageTitle(t("Title"));
}

export default function FixPage() {
  return <FixLoader />;
}
