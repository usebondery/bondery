import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { FixLoader } from "./FixLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("FixContactsPage");
  return staticPageTitle(t("Title"));
}

export default function FixPage() {
  return <FixLoader />;
}
